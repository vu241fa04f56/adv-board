import React, { useState, useEffect } from 'react';
import {
  FileUp,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Cloud,
  Laptop,
  Search,
  RefreshCw,
  FolderDown,
  CloudDownload,
  ExternalLink,
} from 'lucide-react';
import { loadPdfDocumentFromFile, loadPdfDocumentFromStore } from '../lib/pdfUtils';
import { savePdfFile, getPdfMeta, getDB } from '../lib/db';
import {
  DrivePdfFile,
  listPdfFilesFromDrive,
  downloadPdfToStore,
} from '../lib/googleDrive';
import { useAuth } from '../contexts/AuthContext';
import { TransferMeter } from './TransferMeter';

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (
    pdfId: string,
    pdfFilename: string,
    pageCount: number,
    insertAtIndex?: number
  ) => void;
  targetInsertIndex?: number;
  driveToken?: string | null;
  onRequestDriveToken?: () => void;
}

export const ImportPdfModal: React.FC<ImportPdfModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  targetInsertIndex,
  driveToken,
  onRequestDriveToken,
}) => {
  const { isOnline } = useAuth();
  const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [transfer, setTransfer] = useState<{ mode: 'upload' | 'download' | 'local'; done: number; total: number; speed: number; eta: number | null; label: string } | null>(null);
  const transferRef = React.useRef({ label: '', done: 0, at: 0, speed: 0 });

  // Google Drive tab state
  const updateTransfer = (mode: 'upload' | 'download' | 'local', done: number, total: number, label: string) => {
    const now = performance.now();
    const prev = transferRef.current;
    const same = prev.label === label;
    const dt = (now - prev.at) / 1000;
    const delta = done - (same ? prev.done : 0);
    const instant = dt > 0.2 && delta > 0 ? delta / dt : 0;
    const speed = instant > 0 ? (same && prev.speed > 0 ? prev.speed * 0.65 + instant * 0.35 : instant) : prev.speed;
    transferRef.current = { label, done, at: now, speed };
    setTransfer({ mode, done, total, speed, eta: speed > 0 ? Math.max(0, (total - done) / speed) : null, label });
  };

  const [drivePdfs, setDrivePdfs] = useState<DrivePdfFile[]>([]);
  const [isFetchingDrivePdfs, setIsFetchingDrivePdfs] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [importingDriveFileId, setImportingDriveFileId] = useState<string | null>(null);

  // Fetch Drive PDFs when tab changes or driveToken changes
  const fetchDrivePdfs = async (token: string, search?: string) => {
    setIsFetchingDrivePdfs(true);
    setError(null);
    try {
      const pdfs = await listPdfFilesFromDrive(token, search);
      setDrivePdfs(pdfs);
    } catch (err: any) {
      console.error('[ImportPdfModal] Error fetching PDFs from Drive:', err);
      setError('Failed to list PDFs from Google Drive. Please try refreshing.');
    } finally {
      setIsFetchingDrivePdfs(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'drive' && driveToken) {
      fetchDrivePdfs(driveToken, driveSearchQuery);
    }
  }, [isOpen, activeTab, driveToken]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf' && !selected.name.endsWith('.pdf')) {
        setError('Please select a valid PDF file.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  // Process Local PDF
  const handleProcessLocalPdf = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setProgressStatus('Reading PDF file bytes...');

    try {
      const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // PDF.js uses range requests against the File. The full 500+ MB file is
      // never copied into an ArrayBuffer just to discover the page count.
      setProgressStatus('Reading PDF structure (large-file mode)...');
      const pdfDoc = await loadPdfDocumentFromFile(pdfId, file);
      const pageCount = pdfDoc.numPages;

      if (pageCount === 0) throw new Error('This PDF has 0 pages or is unreadable.');

      setProgressStatus(`Saving ${formatFileSize(file.size)} in 8 MiB chunks...`);
      await savePdfFile(pdfId, file.name, file, pageCount, {
        source: 'local',
        onProgress: (done, total) => {
          setProgressStatus(`Saving PDF: ${formatFileSize(done)} / ${formatFileSize(total)}`);
          updateTransfer('local', done, total, 'Saving PDF to local storage');
        },
      });

      setProgressStatus('PDF loaded successfully!');
      setTransfer(null);
      onImportSuccess(pdfId, file.name, pageCount, targetInsertIndex);
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to import PDF:', err);
      setError(err?.message || 'Failed to parse PDF file. Please try another PDF.');
      setIsLoading(false);
      setTransfer(null);
    }
  };

  // Process Drive PDF import
  const handleProcessDrivePdf = async (driveFile: DrivePdfFile) => {
    if (!driveToken) {
      if (onRequestDriveToken) onRequestDriveToken();
      return;
    }

    setImportingDriveFileId(driveFile.id);
    setIsLoading(true);
    setError(null);
    setProgressStatus(`Downloading "${driveFile.name}" from Google Drive...`);

    try {
      const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!driveFile.size) {
        throw new Error('Google Drive did not report the PDF size. Refresh the list and try again.');
      }

      setProgressStatus(`Downloading ${formatFileSize(driveFile.size)} in resumable chunks...`);
      await downloadPdfToStore(driveToken, driveFile, pdfId, (done, total) => {
        setProgressStatus(`Downloading PDF: ${formatFileSize(done)} / ${formatFileSize(total)}`);
        updateTransfer('download', done, total, `Downloading ${driveFile.name}`);
      });

      setProgressStatus('Parsing PDF structure (range-backed)...');
      const pdfDoc = await loadPdfDocumentFromStore(pdfId);
      const pageCount = pdfDoc.numPages;

      if (pageCount === 0) throw new Error('This PDF has 0 pages or is unreadable.');

      // Update metadata with the discovered page count without copying the PDF.
      const meta = await getPdfMeta(pdfId);
      if (meta) {
        const db = await getDB();
        await db.put('pdfMeta', { ...meta, pageCount, updatedAt: Date.now() });
      }

      setProgressStatus('PDF loaded successfully!');
      setTransfer(null);
      onImportSuccess(pdfId, driveFile.name, pageCount, targetInsertIndex);
      setIsLoading(false);
      setImportingDriveFileId(null);
      onClose();
    } catch (err: any) {
      console.error('Failed to import PDF from Drive:', err);
      setError(err?.message || 'Failed to import PDF from Google Drive.');
      setIsLoading(false);
      setImportingDriveFileId(null);
      setTransfer(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg text-slate-100 shadow-2xl overflow-hidden flex flex-col relative max-h-[85vh] animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import PDF Document</h3>
              <p className="text-xs text-slate-400">
                {targetInsertIndex !== undefined
                  ? `Inserting pages at position ${targetInsertIndex + 1}`
                  : 'Appends PDF pages directly into section'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('local')}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'local'
                ? 'bg-purple-900/90 text-purple-100 border border-purple-600/80 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Local Device</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'drive'
                ? 'bg-blue-900/90 text-blue-100 border border-blue-600/80 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cloud className="w-4 h-4 text-blue-400" />
            <span>Google Drive</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Local Device */}
        {activeTab === 'local' && (
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="mb-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 cursor-pointer bg-slate-950/40 hover:bg-purple-950/20 transition-all text-center group">
                <FileText className="w-12 h-12 text-slate-500 group-hover:text-purple-400 transition-colors mb-3" />
                <span className="text-sm font-semibold text-slate-200">
                  {file ? file.name : 'Click or Drag PDF file here'}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {file ? formatFileSize(file.size) : 'Select a PDF from your computer'}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
              </label>
            </div>

            {isLoading && (
              <div className="mb-4">
                {transfer ? (
                  <TransferMeter mode={transfer.mode} label={transfer.label} done={transfer.done} total={transfer.total} speed={transfer.speed} etaSeconds={transfer.eta} />
                ) : (
                  <div className="p-3 bg-purple-950/60 border border-purple-800/60 rounded-xl text-xs text-purple-200 flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                    <span>{progressStatus}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessLocalPdf}
                disabled={!file || isLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-md"
              >
                <span>Import Document</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Google Drive */}
        {activeTab === 'drive' && (
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            {!isOnline ? (
              <div className="py-8 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center mx-auto text-amber-400">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300 mb-1">
                    You are currently offline
                  </h4>
                  <p className="text-xs text-amber-200/80 max-w-xs mx-auto mb-4 leading-relaxed">
                    Internet connection is required to browse Google Drive. Switch to the <strong>Local Device</strong> tab above to import any PDF stored on your computer offline!
                  </p>
                  <button
                    onClick={() => setActiveTab('local')}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg mx-auto"
                  >
                    Switch to Local Device Tab
                  </button>
                </div>
              </div>
            ) : !driveToken ? (
              <div className="py-8 text-center space-y-4 my-auto">
                <div className="w-12 h-12 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center mx-auto text-blue-400">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Connect Google Drive Account
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed">
                    Access and import PDF documents stored directly in your personal or school Google Drive.
                  </p>
                  <button
                    onClick={() => onRequestDriveToken && onRequestDriveToken()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center space-x-2 mx-auto"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Connect Google Drive</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden space-y-3">
                {/* Search & Refresh controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={driveSearchQuery}
                      onChange={(e) => {
                        setDriveSearchQuery(e.target.value);
                        if (driveToken) fetchDrivePdfs(driveToken, e.target.value);
                      }}
                      placeholder="Search PDFs in Google Drive..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-medium"
                    />
                  </div>
                  <button
                    onClick={() => driveToken && fetchDrivePdfs(driveToken, driveSearchQuery)}
                    disabled={isFetchingDrivePdfs}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors shrink-0"
                    title="Refresh Google Drive PDF list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingDrivePdfs ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isLoading && (
                  <div className="shrink-0 space-y-2">
                    {transfer ? (
                      <TransferMeter mode={transfer.mode} label={transfer.label} done={transfer.done} total={transfer.total} speed={transfer.speed} etaSeconds={transfer.eta} />
                    ) : (
                      <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl text-xs text-blue-200 flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                        <span>{progressStatus}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Drive PDF List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[280px]">
                  {isFetchingDrivePdfs ? (
                    <div className="py-10 text-center space-y-2">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Searching Drive for PDF files...</p>
                    </div>
                  ) : drivePdfs.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <FolderDown className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">
                        No PDF files found in your Google Drive
                      </p>
                    </div>
                  ) : (
                    drivePdfs.map((pdf) => {
                      const isImportingThis = importingDriveFileId === pdf.id;
                      const formattedDate = pdf.modifiedTime
                        ? new Date(pdf.modifiedTime).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '';

                      return (
                        <div
                          key={pdf.id}
                          className="flex items-center justify-between p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all gap-2 group"
                        >
                          <div className="flex items-center space-x-3 truncate min-w-0">
                            <div className="p-2 bg-red-950/80 border border-red-800/80 rounded-lg text-red-400 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate min-w-0">
                              <h5 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                                {pdf.name}
                              </h5>
                              <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                {formattedDate && <span>Modified: {formattedDate}</span>}
                                {pdf.size && <span>• {formatFileSize(pdf.size)}</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {pdf.webViewLink && (
                              <a
                                href={pdf.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                                title="Preview PDF on Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleProcessDrivePdf(pdf)}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all shadow-xs disabled:opacity-50"
                            >
                              {isImportingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CloudDownload className="w-3.5 h-3.5" />
                              )}
                              <span>Import</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

