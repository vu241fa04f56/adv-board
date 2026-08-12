import React, { useState } from 'react';
import { Download, FileDown, FileCode, X, Loader2, Check, CloudUpload } from 'lucide-react';
import { PageData, NotebookData } from '../types';
import { generateAnnotatedPdf, loadPdfDocumentFromStore } from '../lib/pdfUtils';

interface ExportModalProps {
  pages: PageData[];
  activePage: PageData;
  notebook: NotebookData;
  isOpen: boolean;
  onClose: () => void;
  onSaveToDrive?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  pages,
  activePage,
  notebook,
  isOpen,
  onClose,
  onSaveToDrive,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [exportType, setExportType] = useState<'pdf' | 'json' | 'drive'>('pdf');

  if (!isOpen) return null;

  const handleExport = async () => {
    if (exportType === 'drive') {
      onClose();
      if (onSaveToDrive) {
        onSaveToDrive();
      }
      return;
    }

    setIsExporting(true);

    try {
      if (exportType === 'pdf') {
        const pdfBlob = await generateAnnotatedPdf(
          pages,
          notebook.title,
          undefined,
          (current, total) => {
            setProgress({ current, total });
          },
          async (pdfId) => loadPdfDocumentFromStore(pdfId)
        );

        // Trigger browser download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${notebook.title.replace(/\s+/g, '_')}_Annotated.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (exportType === 'json') {
        const backupData = {
          notebook,
          pages,
          exportedAt: new Date().toISOString(),
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${notebook.title.replace(/\s+/g, '_')}_Backup.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-slate-100 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Download / Export Notebook</h3>
            <p className="text-xs text-slate-400">Save annotated documents to local storage</p>
          </div>
        </div>

        {/* Export Type Selection */}
        <div className="space-y-2.5 mb-6">
          <button
            onClick={() => setExportType('pdf')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              exportType === 'pdf'
                ? 'border-purple-500 bg-purple-950/50 ring-1 ring-purple-500'
                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileDown className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-sm font-bold text-white">Full Annotated PDF (Local Download)</div>
                <div className="text-xs text-slate-400">
                  Combines all {pages.length} pages + stylus handwriting into vector PDF
                </div>
              </div>
            </div>
            {exportType === 'pdf' && <Check className="w-4 h-4 text-purple-400" />}
          </button>

          {onSaveToDrive && (
            <button
              onClick={() => setExportType('drive')}
              className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                exportType === 'drive'
                  ? 'border-blue-500 bg-blue-950/50 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CloudUpload className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-sm font-bold text-white">Save Written PDF to Google Drive</div>
                  <div className="text-xs text-slate-400">
                    Uploads rendered written PDF & backup into your Google Drive account
                  </div>
                </div>
              </div>
              {exportType === 'drive' && <Check className="w-4 h-4 text-blue-400" />}
            </button>
          )}

          <button
            onClick={() => setExportType('json')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              exportType === 'json'
                ? 'border-purple-500 bg-purple-950/50 ring-1 ring-purple-500'
                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileCode className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-sm font-bold text-white">Portable JSON Backup</div>
                <div className="text-xs text-slate-400">
                  Saves editable notebook structure & raw stroke vector annotations
                </div>
              </div>
            </div>
            {exportType === 'json' && <Check className="w-4 h-4 text-purple-400" />}
          </button>
        </div>

        {isExporting && (
          <div className="mb-5 p-3 bg-purple-950/60 border border-purple-800/60 rounded-xl text-xs text-purple-300 flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
            <span>
              Exporting page {progress.current} of {progress.total}...
            </span>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
