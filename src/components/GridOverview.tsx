import React from 'react';
import { PageData } from '../types';
import { FileText, Plus, Trash2, Copy } from 'lucide-react';

interface GridOverviewProps {
  pages: PageData[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onOpenPageManager: () => void;
  onOpenImportPdfModal: () => void;
}

export const GridOverview: React.FC<GridOverviewProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onOpenPageManager,
  onOpenImportPdfModal,
}) => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Section Overview</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse all {pages.length} pages or insert new pages between them
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onOpenImportPdfModal}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
          >
            <span>+ Import PDF</span>
          </button>
          <button
            onClick={onOpenPageManager}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Manage & Insert Pages</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {pages.map((page, idx) => (
          <div
            key={page.id}
            style={{ contentVisibility: 'auto', contain: 'layout paint style', containIntrinsicSize: '300px' }}
            onClick={() => onSelectPage(page.id)}
            className={`group relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col items-center justify-between ${
              page.id === activePageId
                ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-400 hover:shadow-lg'
            }`}
          >
            {/* Page Thumbnail Mock Card */}
            <div className="w-full aspect-3/4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between shadow-xs relative overflow-hidden mb-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                <span className="font-mono text-[10px] font-bold text-slate-400">P. {idx + 1}</span>
                <FileText
                  className={`w-4 h-4 ${page.pdfId ? 'text-amber-500' : 'text-purple-500'}`}
                />
              </div>

              <div className="flex-1 my-2 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {page.title}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 capitalize">
                  {page.pdfId ? `PDF Page ${page.pdfPageNumber}` : page.paperTemplate}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 text-right">
                {page.annotations?.length || 0} items
              </div>
            </div>

            <div className="w-full text-center">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {page.title}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
