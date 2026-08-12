import React, { useState } from 'react';
import { X, Share2, Copy, Check, ExternalLink, ShieldCheck, Eye } from 'lucide-react';
import { NotebookData, SectionData } from '../types';
import { generateShareUrl } from '../lib/shareUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: NotebookData | undefined;
  sections: SectionData[];
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  notebook,
  sections,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !notebook) return null;

  const notebookSections = sections.filter((s) => s.notebookId === notebook.id);
  const totalPages = notebookSections.reduce((acc, sec) => acc + (sec.pages?.length || 0), 0);
  const shareUrl = generateShareUrl(notebook, notebookSections);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const input = document.getElementById('share-url-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-purple-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-purple-800 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-800/80 rounded-lg">
              <Share2 className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Share Notebook</h3>
              <p className="text-xs text-purple-200">Generate a view-only link with progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-purple-800 dark:hover:bg-slate-800 rounded-lg text-purple-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Notebook Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {notebook.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {notebookSections.length} Sections • {totalPages} Pages
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" />
              View Only
            </span>
          </div>

          {/* Share Link Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 transition-all shadow-xs shrink-0 ${
                  copied
                    ? 'bg-emerald-600'
                    : 'bg-purple-600 hover:bg-purple-500 active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Information banner */}
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
            <div className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
              <p className="font-semibold">Read-Only View Protected</p>
              <p className="text-purple-700 dark:text-purple-300 mt-0.5">
                Anyone with this link will be able to view your notebook pages and drawing annotations without being able to edit your original notebook.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
          >
            <span>Preview Shared View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
