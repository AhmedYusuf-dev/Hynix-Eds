import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Message } from '../types';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown, Copy, Check, Download, Code2, Eye, RefreshCw, Monitor, MoreVertical, Pencil, Trash2, X } from 'lucide-react';

interface CodeWorkspaceProps {
  messages: Message[];
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: Record<string, FileNode>;
  language?: string;
}

interface FileData {
    content: string;
    language: string;
}

interface ContextMenuState {
    x: number;
    y: number;
    path: string;
    type: 'file' | 'folder';
}

const buildFileTree = (files: Record<string, FileData>) => {
  const root: Record<string, FileNode> = {};

  Object.entries(files).forEach(([path, { content, language }]) => {
    const parts = path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (!current[part]) {
        current[part] = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : {},
          content: isFile ? content : undefined,
          language: isFile ? language : undefined
        };
      } else if (isFile) {
        // Update content if file already exists (latest version wins)
        current[part].content = content;
        current[part].language = language;
      }

      if (!isFile) {
        current = current[part].children!;
      }
    });
  });

  return root;
};

const FileTreeItem: React.FC<{
  node: FileNode;
  selectedPath: string | null;
  onSelect: (node: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath: string | null;
  onRenameSubmit: (oldPath: string, newName: string) => void;
  onRenameCancel: () => void;
  level?: number;
}> = ({ node, selectedPath, onSelect, onContextMenu, renamingPath, onRenameSubmit, onRenameCancel, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editName, setEditName] = useState(node.name);
  const isSelected = node.path === selectedPath;
  const isRenaming = node.path === renamingPath;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isRenaming) {
          setEditName(node.name);
          setTimeout(() => inputRef.current?.focus(), 50);
      }
  }, [isRenaming, node.name]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          onRenameSubmit(node.path, editName);
      } else if (e.key === 'Escape') {
          onRenameCancel();
      }
  }

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors group relative ${
          isSelected 
            ? 'bg-hynix-100 dark:bg-hynix-900/30 text-hynix-700 dark:text-hynix-300' 
            : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {node.type === 'folder' && (
          <span className="text-gray-400">
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        
        {node.type === 'folder' ? (
          isOpen ? <FolderOpen size={14} className="text-blue-400 shrink-0" /> : <Folder size={14} className="text-blue-400 shrink-0" />
        ) : (
          <FileText size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
        )}
        
        {isRenaming ? (
            <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => onRenameSubmit(node.path, editName)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-white dark:bg-dark-900 border border-hynix-500 rounded px-1 py-0.5 outline-none w-full min-w-[50px]"
            />
        ) : (
            <span className="text-xs truncate">{node.name}</span>
        )}
      </div>
      
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {(Object.values(node.children) as FileNode[])
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'folder' ? -1 : 1;
            })
            .map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                renamingPath={renamingPath}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({ messages }) => {
  const [files, setFiles] = useState<Record<string, FileData>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [previewKey, setPreviewKey] = useState(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  
  // Track previous generation to strictly add ONLY new/changed files from AI,
  // preserving user deletions/renames on other files.
  const prevGeneratedFilesRef = useRef<Record<string, FileData>>({});

  // Parse messages to extract files
  const generatedFiles = useMemo(() => {
    const extractedFiles: Record<string, FileData> = {};
    const regex = /(?:^|\n)###\s+File:\s+([^\n]+)\s*```(\w+)?\n([\s\S]*?)```/g;

    messages.forEach(msg => {
      if (msg.role === 'model') {
        let match;
        const text = msg.text; 
        while ((match = regex.exec(text)) !== null) {
          const path = match[1].trim();
          const language = match[2] || 'text';
          const content = match[3];
          extractedFiles[path] = { content, language };
        }
      }
    });
    return extractedFiles;
  }, [messages]);

  // Sync logic: Merge generated files into local state
  useEffect(() => {
    setFiles(prevFiles => {
        const nextFiles = { ...prevFiles };
        let hasUpdates = false;

        Object.entries(generatedFiles).forEach(([path, file]) => {
            const prev = prevGeneratedFilesRef.current[path];
            // If this is a new file from AI OR the AI has updated the content
            if (!prev || prev.content !== file.content) {
                nextFiles[path] = file;
                hasUpdates = true;
            }
        });
        
        prevGeneratedFilesRef.current = generatedFiles;
        return hasUpdates ? nextFiles : prevFiles;
    });
  }, [generatedFiles]);

  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const fileList = Object.keys(files);

  // Construct preview content by bundling resources
  const previewContent = useMemo(() => {
      const indexFileKey = Object.keys(files).find(k => k.endsWith('index.html'));
      if (!indexFileKey) return null;

      let html = files[indexFileKey].content;

      // Basic Injection Logic
      Object.keys(files).forEach(path => {
          if (path === indexFileKey) return;
          const file = files[path];
          const filename = path.split('/').pop() || path;

          if (path.endsWith('.css')) {
              const regex = new RegExp(`<link[^>]+href=["'](./)?${filename.replace('.', '\\.')}["'][^>]*>`, 'g');
              html = html.replace(regex, `<style>\n${file.content}\n</style>`);
          }
          
          if (path.endsWith('.js')) {
              const regex = new RegExp(`<script[^>]+src=["'](./)?${filename.replace('.', '\\.')}["'][^>]*>\\s*</script>`, 'g');
              html = html.replace(regex, `<script>\n${file.content}\n</script>`);
          }
      });

      return html;
  }, [files]);

  const hasPreviewableContent = !!previewContent;
  const activeFileContent = selectedFile ? files[selectedFile]?.content : '';

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          path: node.path,
          type: node.type
      });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleRenameAction = () => {
      if (contextMenu) {
          setRenamingPath(contextMenu.path);
          closeContextMenu();
      }
  };

  const handleDeleteAction = () => {
      if (contextMenu) {
          const pathToDelete = contextMenu.path;
          setFiles(prev => {
              const next = { ...prev };
              // Delete the specific file
              if (next[pathToDelete]) {
                  delete next[pathToDelete];
              }
              // If folder, delete all children
              Object.keys(next).forEach(key => {
                  if (key.startsWith(pathToDelete + '/')) {
                      delete next[key];
                  }
              });
              return next;
          });
          if (selectedFile === pathToDelete || selectedFile?.startsWith(pathToDelete + '/')) {
              setSelectedFile(null);
          }
          closeContextMenu();
      }
  };

  const handleRenameSubmit = (oldPath: string, newName: string) => {
      if (!newName || newName === oldPath.split('/').pop()) {
          setRenamingPath(null);
          return;
      }
      
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      setFiles(prev => {
          const next = { ...prev };
          
          // Helper to move a single file
          const moveFile = (from: string, to: string) => {
              if (next[from]) {
                  next[to] = next[from];
                  delete next[from];
              }
          };

          // If it's a file in our map
          if (next[oldPath]) {
              moveFile(oldPath, newPath);
          }

          // Check if it's a folder (update all children)
          Object.keys(next).forEach(key => {
              if (key.startsWith(oldPath + '/')) {
                  const suffix = key.substring(oldPath.length);
                  const newChildPath = newPath + suffix;
                  moveFile(key, newChildPath);
              }
          });

          return next;
      });

      if (selectedFile === oldPath) setSelectedFile(newPath);
      setRenamingPath(null);
  };

  const handleCopy = () => {
    if (activeFileContent) {
      navigator.clipboard.writeText(activeFileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
      if (activeFileContent && selectedFile) {
          const blob = new Blob([activeFileContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const filename = selectedFile.split('/').pop() || 'download.txt';
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      }
  }

  if (fileList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white dark:bg-dark-900 border-l border-gray-200 dark:border-dark-700 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <Code2 size={32} className="text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">Workspace Empty</h3>
        <p className="text-xs text-gray-500 max-w-[200px]">
          Ask Creatore to "create a project" or "write code for a website" to see files here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-dark-900 border-l border-gray-200 dark:border-dark-700 text-sm overflow-hidden flex-col md:flex-row relative">
      {/* File Explorer Sidebar */}
      <div className="w-64 flex flex-col border-r border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-850 shrink-0 h-full hidden md:flex">
        <div className="p-3 border-b border-gray-200 dark:border-dark-700 font-medium text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-2"><FolderOpen size={14} /> Explorer</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {(Object.values(fileTree) as FileNode[])
            .sort((a, b) => {
               if (a.type === b.type) return a.name.localeCompare(b.name);
               return a.type === 'folder' ? -1 : 1;
            })
            .map(node => (
            <FileTreeItem
              key={node.path}
              node={node}
              selectedPath={selectedFile}
              onSelect={(n) => { setSelectedFile(n.path); setViewMode('code'); }}
              onContextMenu={handleContextMenu}
              renamingPath={renamingPath}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={() => setRenamingPath(null)}
            />
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-[#ffffff] dark:bg-[#0d1117] overflow-hidden">
        {/* Workspace Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-[#161b22] shrink-0">
            {/* View Mode Toggles */}
            <div className="flex bg-gray-200 dark:bg-dark-800 p-0.5 rounded-lg">
                <button 
                    onClick={() => setViewMode('code')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'code' ? 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Code2 size={14} /> Code
                </button>
                <button 
                    onClick={() => setViewMode('preview')}
                    disabled={!hasPreviewableContent}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'} ${!hasPreviewableContent ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!hasPreviewableContent ? "No index.html found" : "Preview"}
                >
                    <Eye size={14} /> Preview
                </button>
            </div>

            <div className="flex items-center gap-2">
                {viewMode === 'code' && selectedFile && (
                    <>
                        <button onClick={handleDownload} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Download File">
                            <Download size={14} />
                        </button>
                        <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors">
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </>
                )}
                {viewMode === 'preview' && (
                    <button onClick={() => setPreviewKey(k => k + 1)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Refresh Preview">
                        <RefreshCw size={14} />
                    </button>
                )}
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
            {viewMode === 'code' ? (
                selectedFile ? (
                    <div className="h-full overflow-auto p-4 font-mono text-sm leading-relaxed">
                      <pre className="text-gray-800 dark:text-gray-300">
                        <code>{activeFileContent}</code>
                      </pre>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                        Select a file to view content
                    </div>
                )
            ) : (
                hasPreviewableContent ? (
                    <iframe 
                        key={previewKey}
                        srcDoc={previewContent || ''}
                        className="w-full h-full bg-white border-0"
                        title="Preview"
                        sandbox="allow-scripts allow-modals" 
                    />
                ) : (
                    <div className="flex flex-col h-full items-center justify-center text-gray-400">
                        <Monitor size={32} className="mb-2 opacity-20" />
                        <p>Preview not available</p>
                        <p className="text-xs mt-1">Create an index.html file to enable preview.</p>
                    </div>
                )
            )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="fixed z-50 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-xl py-1 w-40 animate-slide-up"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
              <button 
                onClick={handleRenameAction}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                  <Pencil size={14} /> Rename
              </button>
              <button 
                onClick={handleDeleteAction}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-red-600 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                  <Trash2 size={14} /> Delete
              </button>
          </div>
      )}
    </div>
  );
};