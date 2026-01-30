import React, { useRef, useEffect, useState } from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Bot, User, Sparkles, Loader2, Globe, Cpu, Zap, Library, FileAudio, FileVideo, FileText, Volume2, Copy, Check, StopCircle, RefreshCw, Pencil, X, Save } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  isThinking: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onRegenerate: () => void;
  onEdit: (messageId: string, newText: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading, isThinking, onSuggestionClick, onRegenerate, onEdit }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (isThinking || isLoading) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isLoading]);

  const handleSpeak = (text: string, id: string) => {
      if (playingMessageId === id) {
          window.speechSynthesis.cancel();
          setPlayingMessageId(null);
          return;
      }
      
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setPlayingMessageId(null);
      setPlayingMessageId(id);
      window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const startEditing = (msg: Message) => {
      setEditingMessageId(msg.id);
      setEditText(msg.text);
  };

  const saveEdit = (id: string) => {
      onEdit(id, editText);
      setEditingMessageId(null);
  };

  const cancelEdit = () => {
      setEditingMessageId(null);
      setEditText('');
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-slide-up">
        <div className="w-20 h-20 bg-gradient-to-tr from-hynix-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-hynix-500/20 relative">
          <Library className="text-white w-10 h-10 relative z-10" />
          <div className="absolute inset-0 bg-hynix-400 blur-xl opacity-20 rounded-full animate-pulse-slow"></div>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-hynix-600 to-hynix-500 dark:from-white dark:via-hynix-200 dark:to-hynix-400 mb-2">
          Hynix Eds
        </h1>
        <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-gray-100 dark:bg-hynix-900/50 text-hynix-700 dark:text-hynix-300 px-2 py-0.5 rounded border border-gray-200 dark:border-hynix-800">1.3 Pro</span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-lg mb-8">
          Powered by Gemini 2.5 Flash with Enhanced Reasoning
        </p>
        
        <div className="flex gap-4 mb-12">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 flex items-center justify-center mb-2 shadow-sm">
                    <Zap size={18} className="text-yellow-500 dark:text-yellow-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fast</span>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 flex items-center justify-center mb-2 shadow-sm">
                    <Sparkles size={18} className="text-purple-500 dark:text-purple-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Smart</span>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 flex items-center justify-center mb-2 shadow-sm">
                    <Globe size={18} className="text-blue-500 dark:text-blue-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Grounded</span>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <button onClick={() => onSuggestionClick("Write a Python script to visualize neural network weights")} className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-dark-700 hover:border-hynix-400 dark:hover:border-hynix-600 transition-colors text-left shadow-sm group">
            <span className="text-hynix-600 dark:text-hynix-400 font-mono text-xs mb-2 block group-hover:text-hynix-500">CODING</span>
            <p className="text-sm text-gray-600 dark:text-gray-300">"Write a Python script to visualize neural network weights"</p>
          </button>
          <button onClick={() => onSuggestionClick("Explain quantum entanglement to a 5-year-old")} className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-dark-700 hover:border-hynix-400 dark:hover:border-hynix-600 transition-colors text-left shadow-sm group">
            <span className="text-purple-600 dark:text-purple-400 font-mono text-xs mb-2 block group-hover:text-purple-500">REASONING</span>
            <p className="text-sm text-gray-600 dark:text-gray-300">"Explain quantum entanglement to a 5-year-old"</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {messages.map((msg, idx) => (
        <div
          key={msg.id}
          className={`flex gap-4 max-w-4xl mx-auto ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === Role.MODEL && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hynix-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
              <Bot size={18} className="text-white" />
            </div>
          )}
          
          <div className={`flex flex-col max-w-[85%] ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
            <div
              className={`rounded-2xl px-5 py-4 shadow-sm relative group/msg ${
                msg.role === Role.USER
                  ? 'bg-hynix-600 text-white'
                  : 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3">
                    {msg.attachments.map((att, idx) => {
                        const src = `data:${att.mimeType};base64,${att.data}`;
                        if (att.mimeType.startsWith('image/')) {
                            return (
                                <img 
                                    key={idx} 
                                    src={src} 
                                    alt={att.name || "attachment"} 
                                    className="max-h-64 max-w-full rounded-lg border border-white/10 object-contain"
                                />
                            );
                        } else if (att.mimeType.startsWith('video/')) {
                             return (
                                <video 
                                    key={idx} 
                                    src={src} 
                                    controls 
                                    className="max-h-64 max-w-full rounded-lg border border-white/10"
                                />
                            );
                        } else if (att.mimeType.startsWith('audio/')) {
                             return (
                                <div key={idx} className="w-full max-w-md bg-black/10 dark:bg-dark-900/30 rounded-lg p-2 border border-black/5 dark:border-white/10 flex items-center gap-2">
                                    <div className="p-2 bg-white dark:bg-dark-800 rounded-full text-purple-500 dark:text-purple-400">
                                        <FileAudio size={16} />
                                    </div>
                                    <audio src={src} controls className="w-full h-8" />
                                </div>
                            );
                        } else {
                             return (
                                 <div key={idx} className="flex items-center gap-2 p-3 bg-black/5 dark:bg-dark-900/30 rounded-lg border border-black/5 dark:border-white/10">
                                    <FileText size={20} className="text-gray-500 dark:text-gray-400" />
                                    <span className="text-sm truncate max-w-[200px]">{att.name || 'File'}</span>
                                </div>
                            );
                        }
                    })}
                 </div>
              )}
              
              {/* Edit Mode */}
              {editingMessageId === msg.id ? (
                  <div className="w-full min-w-[300px]">
                      <textarea 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 text-gray-900 dark:text-white bg-white/10 rounded-md border border-white/20 focus:outline-none focus:border-white/50"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                          <button onClick={cancelEdit} className="p-1 hover:bg-white/10 rounded"><X size={16}/></button>
                          <button onClick={() => saveEdit(msg.id)} className="p-1 hover:bg-white/10 rounded"><Save size={16}/></button>
                      </div>
                  </div>
              ) : (
                  msg.role === Role.USER ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <MarkdownRenderer content={msg.text} />
                  )
              )}

              {/* Edit Icon for User */}
              {msg.role === Role.USER && !editingMessageId && !isLoading && (
                  <button 
                    onClick={() => startEditing(msg)}
                    className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-hynix-500 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                    title="Edit message"
                  >
                      <Pencil size={14} />
                  </button>
              )}
            </div>

            {/* Actions Bar for Model Messages */}
            {msg.role === Role.MODEL && !isLoading && (
                 <div className="flex items-center gap-2 mt-1 ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                     <button 
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                        title="Copy text"
                     >
                         {copiedMessageId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                     </button>
                     <button 
                        onClick={() => handleSpeak(msg.text, msg.id)}
                        className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ${playingMessageId === msg.id ? 'text-hynix-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        title="Read aloud"
                     >
                         {playingMessageId === msg.id ? <StopCircle size={14} /> : <Volume2 size={14} />}
                     </button>
                     {/* Show Regenerate only on the last message */}
                     {idx === messages.length - 1 && (
                         <button 
                            onClick={onRegenerate}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                            title="Regenerate response"
                         >
                             <RefreshCw size={14} />
                         </button>
                     )}
                 </div>
            )}

            {/* Grounding Sources */}
            {msg.role === Role.MODEL && msg.groundingMetadata && msg.groundingMetadata.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                <div className="mt-2 ml-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        <Globe size={12} />
                        <span>Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {msg.groundingMetadata.groundingChunks.map((chunk, idx) => {
                            if (!chunk.web?.uri) return null;
                            return (
                                <a
                                    key={idx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block max-w-[200px] truncate text-xs bg-white dark:bg-dark-800 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-700 text-hynix-600 dark:text-hynix-300 px-2.5 py-1.5 rounded-full transition-colors"
                                    title={chunk.web.title}
                                >
                                    {chunk.web.title || new URL(chunk.web.uri).hostname}
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>

          {msg.role === Role.USER && (
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
              <User size={18} className="text-gray-600 dark:text-gray-300" />
            </div>
          )}
        </div>
      ))}
      
      {isThinking && (
        <div className="flex gap-4 max-w-4xl mx-auto justify-start animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hynix-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg opacity-70">
              <Sparkles size={16} className="text-white animate-spin-slow" />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-dark-800/50 rounded-xl px-4 py-3 border border-gray-200 dark:border-dark-700/50 shadow-sm">
             <Loader2 size={16} className="animate-spin text-hynix-500 dark:text-hynix-400" />
             <span className="text-xs font-mono text-hynix-600 dark:text-hynix-400">HYNIX IS THINKING...</span>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};