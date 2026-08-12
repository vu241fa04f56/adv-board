import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  X,
  FileText,
  FileUp,
  Grid,
  Check,
  Sparkles
} from 'lucide-react';
import { PageData, PaperTemplate } from '../types';

interface PageManagerModalProps {
  pages: PageData[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onInsertPageAt: (index: number, title: string, template: PaperTemplate) => void;
  onDuplicatePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onDeletePage: (pageId: string) => void;
  onOpenImportPdfModalForInsert: (targetIndex: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const PageManagerModal: React.FC<PageManagerModalProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onInsertPageAt,
  onDuplicatePage,
  onMovePage,
  onDeletePage,
  onOpenImportPdfModalForInsert,
  isOpen,
  onClose,
}) => {
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [insertTitle, setInsertTitle] = useState('New Inserted Page');
  const [selectedTemplate, setSelectedTemplate] = useState<PaperTemplate>('grid');

  const [searchQuery, setSearchQuery] = useState('');
  const [pageDisplayLimit, setPageDisplayLimit] = useState(50);

  if (!isOpen) return null;

  const filteredPages = searchQuery.trim()
    ? pages.filter((p, idx) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (idx + 1).toString() === searchQuery.trim()
      )
    : pages;

  const displayedPages = filteredPages.slice(0, pageDisplayLimit);

  const handleConfirmInsert = () => {
    if (insertIndex === null) return;
    onInsertPageAt(insertIndex, insertTitle || 'New Page', selectedTemplate);
    setInsertIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Grid className="w-5 h-5 text-purple-400" />
              <span>Page Organizer & Page Inserter</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Insert blank notebook pages or additional PDFs between existing pages
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid of Page Cards */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {/* Quick Search & Filter Bar */}
          {pages.length > 10 && (
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search page title or type exact page number (e.g. 1500)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 font-mono"
              />
            </div>
          )}

          <div className="space-y-4">
            {/* Top Insert Button (At index 0) */}
            <div className="flex justify-center">
              <button
                onClick={() => setInsertIndex(0)}
                className="group flex items-center space-x-2 px-4 py-2 rounded-full border border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/40 text-purple-300 text-xs font-semibold transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 text-purple-400 group-hover:rotate-90 transition-transform" />
                <span>+ Insert Page at Beginning (Page 1)</span>
              </button>
            </div>

            {displayedPages.map((page) => {
              const idx = pages.findIndex((p) => p.id === page.id);
              return (
                <React.Fragment key={page.id}>
                  {/* Page Card Item */}
                <div
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                    page.id === activePageId
                      ? 'border-purple-500 bg-purple-950/40 shadow-lg ring-1 ring-purple-500'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                    <div className="w-10 h-14 rounded-md border border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-1 text-[10px] text-slate-500 shadow-xs relative overflow-hidden shrink-0">
                      <FileText
                        className={`w-5 h-5 ${
                          page.pdfId ? 'text-amber-500' : 'text-purple-500'
                        }`}
                      />
                      <span className="font-mono font-bold mt-1 text-slate-700 dark:text-slate-300">
                        P.{idx + 1}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">{page.title}</h4>
                        {page.pdfId && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 font-mono">
                            PDF Page {page.pdfPageNumber}
                          </span>
                        )}
                        {!page.pdfId && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 font-mono capitalize">
                            Paper: {page.paperTemplate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Annotations: {page.annotations?.length || 0} items • Created:{' '}
                        {new Date(page.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this Page */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        onSelectPage(page.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                    >
                      Open
                    </button>

                    <button
                      onClick={() => onDuplicatePage(idx)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
                      title="Duplicate Page"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      disabled={idx === 0}
                      onClick={() => onMovePage(idx, idx - 1)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl"
                      title="Move Up"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>

                    <button
                      disabled={idx === pages.length - 1}
                      onClick={() => onMovePage(idx, idx + 1)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl"
                      title="Move Down"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>

                    {pages.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete page "${page.title}"?`)) {
                            onDeletePage(page.id);
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 rounded-xl border border-red-800/50"
                        title="Delete Page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Insert Button BETWEEN Page idx and idx+1 */}
                <div className="flex items-center justify-center py-1">
                  <div className="h-px bg-slate-800 flex-1" />
                  <button
                    onClick={() => setInsertIndex(idx + 1)}
                    className="group flex items-center space-x-1.5 px-3 py-1 rounded-full border border-purple-500/40 hover:border-purple-400 bg-slate-900 hover:bg-purple-950 text-purple-300 text-[11px] font-semibold transition-all hover:scale-105 mx-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-90 transition-transform" />
                    <span>Insert Page Between {idx + 1} & {idx + 2}</span>
                  </button>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>
              </React.Fragment>
            );
          })}

          {filteredPages.length > pageDisplayLimit && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={() => setPageDisplayLimit((prev) => prev + 100)}
                className="px-5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700/80 text-xs font-bold transition-colors"
              >
                + Load {filteredPages.length - pageDisplayLimit} more pages (Showing {pageDisplayLimit} of {filteredPages.length})
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Modal Sub-Dialog for Inserting New Page at Index */}
        {insertIndex !== null && (
          <div className="p-5 bg-slate-950 border-t border-slate-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Insert New Page at Position {insertIndex + 1}</span>
              </h3>
              <button
                onClick={() => setInsertIndex(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Page Name / Header</label>
                <input
                  type="text"
                  value={insertTitle}
                  onChange={(e) => setInsertTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Paper Style Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as PaperTemplate)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden capitalize"
                >
                  <option value="grid">Grid / Math Paper</option>
                  <option value="ruled">Ruled Notebook Paper</option>
                  <option value="dotted">Dotted Grid</option>
                  <option value="blank">Plain White Paper</option>
                  <option value="music">Music Staff Lines</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  const target = insertIndex;
                  setInsertIndex(null);
                  onClose();
                  onOpenImportPdfModalForInsert(target);
                }}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs font-semibold hover:bg-amber-900"
              >
                <FileUp className="w-4 h-4" />
                <span>Or Insert PDF Pages Here</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setInsertIndex(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmInsert}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Insert Page
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
