import React from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-hynix-800 bg-gray-50 dark:bg-[#0d1117] shadow-sm dark:shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#161b22] border-b border-gray-200 dark:border-hynix-800">
        <span className="text-xs font-mono text-gray-600 dark:text-hynix-300 lowercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500 dark:text-green-400" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-800 dark:text-gray-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Very basic parser for splitting code blocks
  // 1. Split by triple backticks
  const parts = content.split(/```(\w*)\n([\s\S]*?)```/g);

  return (
    <div className="prose dark:prose-invert prose-p:text-gray-800 dark:prose-p:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-white max-w-none">
      {parts.map((part, index) => {
        // If index % 3 === 0, it's normal text
        // If index % 3 === 1, it's the language (or empty string)
        // If index % 3 === 2, it's the code
        
        if (index % 3 === 0) {
           // Basic formatting for bold and inline code
           const subParts = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
           return (
             <span key={index} className="whitespace-pre-wrap">
               {subParts.map((sub, subIdx) => {
                  if (sub.startsWith('`') && sub.endsWith('`')) {
                    return <code key={subIdx} className="bg-gray-100 dark:bg-hynix-900/50 text-hynix-700 dark:text-hynix-200 px-1 py-0.5 rounded font-mono text-sm border border-gray-200 dark:border-transparent">{sub.slice(1, -1)}</code>;
                  }
                  if (sub.startsWith('**') && sub.endsWith('**')) {
                    return <strong key={subIdx} className="text-gray-900 dark:text-white font-semibold">{sub.slice(2, -2)}</strong>;
                  }
                  return sub;
               })}
             </span>
           );
        } else if (index % 3 === 1) {
            // This is the language part, we skip rendering it directly, it's consumed by the next block
            return null;
        } else {
            // This is the code part
            const language = parts[index - 1] || '';
            return <CodeBlock key={index} language={language} code={part} />;
        }
      })}
    </div>
  );
};