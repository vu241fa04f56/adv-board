import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  FolderOpen,
  FileText,
  ExternalLink,
  Download,
  Search,
  X,
  Loader2,
  CheckCircle2,
  BookOpen,
  CloudUpload,
} from 'lucide-react';
import { DriveNotebookFile, SavedNotebookPayload, listNotebooksFromDrive, loadNotebookFromDrive, downloadPdfToStore } from '../lib/googleDrive';
import { savePdfBuffer, getDB, getPdfMeta } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

interface DriveOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveToken: string | null;
  onRequestDriveToken: () => void;
  onLoadNotebookPayload: (
    payload: SavedNotebookPayload,
    driveFileId?: string,
    pdfWebViewLink?: string
  ) => void;
}

export const DriveOpenModal: React.FC<DriveOpenModalProps> = ({
  isOpen,
  onClose,
  driveToken,
  onRequestDriveToken,
  onLoadNotebookPayload,
}) => {
  const { isOnline } = useAuth();
  const [notebookFiles, setNotebookFiles] = useState<DriveNotebookFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Fetch notebooks list from Drive
  const fetchDriveNotebooks = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const files = await listNotebooksFromDrive(token);
      setNotebookFiles(files);
    } catch (err: any) {
      console.error('[DriveOpenModal] Error listing drive files:', err);
      setErrorMsg('Failed to fetch notebooks from Google Drive. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && driveToken) {
      fetchDriveNotebooks(driveToken);
    }
  }, [isOpen, driveToken]);

  if (!isOpen) return null;

  const handleOpenNotebook = async (file: DriveNotebookFile) => {
    if (!driveToken) {
      onRequestDriveToken();
      return;
    }

    setLoadingFileId(file.id);
    setErrorMsg(null);
    try {
      const payload = await loadNotebookFromDrive(driveToken, file.id);
      if (!payload || !payload.notebook) {
        setErrorMsg('Could not read notebook data from Google Drive file.');
        setLoadingFileId(null);
        return;
      }

      // v2 notebooks keep only Drive file references. Download each source PDF
      // directly into IndexedDB in 8 MiB chunks; never decode a giant base64 blob.
      if (payload.pdfRefs) {
        const refs = Object.entries(payload.pdfRefs);
        for (let i = 0; i < refs.length; i++) {
          const [pdfId, item] = refs[i];
          try {
            const existing = await getPdfMeta(pdfId);
            if (existing?.size === item.size && existing?.driveFileId === item.fileId) continue;

            await downloadPdfToStore(
              driveToken,
              {
                id: item.fileId,
                name: item.filename,
                modifiedTime: '',
                size: item.size,
              },
              pdfId,
              (done, total) => {
                setSuccessNotice(`Downloading PDF ${i + 1}/${refs.length}: ${Math.round((done / total) * 100)}%`);
              }
            );

            const db = await getDB();
            const meta = await getPdfMeta(pdfId);
            if (meta) await db.put('pdfMeta', { ...meta, pageCount: item.pageCount, updatedAt: Date.now() });
          } catch (e) {
            console.warn('[DriveOpenModal] Failed restoring Drive PDF:', pdfId, e);
          }
        }
      }

      // Backward compatibility for small legacy v1 backups. Large legacy
      // base64 backups are intentionally rejected to avoid browser OOM.
      if (payload.pdfBuffersMap) {
        for (const [pdfId, item] of Object.entries(payload.pdfBuffersMap)) {
          try {
            if (item.base64.length > 140_000_000) {
              throw new Error('Legacy embedded PDF is too large. Re-save the notebook with the new large-file format.');
            }
            const binaryString = atob(item.base64);
            const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
            await savePdfBuffer(pdfId, item.filename, bytes.buffer, item.pageCount);
          } catch (e) {
            console.warn('[DriveOpenModal] Failed restoring legacy PDF:', pdfId, e);
          }
        }
      }

      setSuccessNotice(`Loaded notebook "${payload.notebook.title}" from Google Drive!`);
      setTimeout(() => setSuccessNotice(null), 3000);

      onLoadNotebookPayload(payload, file.id, file.pdfWebViewLink || file.webViewLink);
      onClose();
    } catch (err: any) {
      console.error('[DriveOpenModal] Error loading notebook payload:', err);
      setErrorMsg(`Error loading notebook: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleLocalFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const payload: SavedNotebookPayload = JSON.parse(text);
        if (!payload || !payload.notebook) {
          alert('Invalid notebook file format.');
          return;
        }

        // Restore PDF buffers if present
        if (payload.pdfBuffersMap) {
          for (const [pdfId, item] of Object.entries(payload.pdfBuffersMap)) {
            try {
              const binaryString = atob(item.base64);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              await savePdfBuffer(pdfId, item.filename, bytes.buffer, item.pageCount);
            } catch (err) {
              console.warn('[DriveOpenModal] Error restoring local PDF buffer:', pdfId, err);
            }
          }
        }

        onLoadNotebookPayload(payload);
        onClose();
      } catch (err) {
        alert('Could not parse JSON notebook file.');
      }
    };
    reader.readAsText(file);
  };

  const filteredFiles = notebookFiles.filter((f) => {
    const cleanName = f.name.replace(/_[a-zA-Z0-9_-]+\.onenote\.json$/, '').replace(/\.onenote\.json$/, '');
    return cleanName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-slate-100 shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Open Saved Notebook from Google Drive
              </h2>
              <p className="text-xs text-slate-400">
                Colab-style cloud notebook synchronization and re-writing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Drive notebooks..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-medium"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {driveToken && (
              <button
                onClick={() => fetchDriveNotebooks(driveToken)}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="Refresh Google Drive file list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}

            {/* Local Backup Import */}
            <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-950/60 border border-purple-700/60 hover:bg-purple-900 text-purple-200 rounded-xl text-xs font-semibold cursor-pointer transition-all">
              <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Import .json</span>
              <input
                type="file"
                accept=".json,.onenote.json"
                onChange={handleLocalFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Error / Success Alerts */}
        {!isOnline && (
          <div className="mx-4 mt-3 p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-center gap-2">
            <span>You are currently offline. Internet connection is required to fetch files from Google Drive. You can use <strong>Import .json</strong> above to load local files offline.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="mx-4 mt-3 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Drive Notebook Files List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {!driveToken ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center mx-auto text-blue-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Google Drive Disconnected</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Connect your Google Drive account to view and open your synced notebooks.
                </p>
                <button
                  onClick={onRequestDriveToken}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Connect Google Drive
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Scanning Google Drive for notebooks...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">No saved notebooks found in Drive</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Click <span className="text-blue-400 font-bold">"Save to Drive"</span> on any notebook in the header bar to save your progress directly into Google Drive.
                </p>
              </div>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const cleanTitle = f.name
                .replace(/_[a-zA-Z0-9_-]+\.onenote\.json$/, '')
                .replace(/\.onenote\.json$/, '');
              const isOpening = loadingFileId === f.id;
              const formattedDate = f.modifiedTime
                ? new Date(f.modifiedTime).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Unknown date';

              return (
                <div
                  key={f.id}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all gap-3"
                >
                  <div className="flex items-center space-x-3 truncate flex-1 min-w-0">
                    <div className="p-2.5 bg-purple-950/80 border border-purple-800/80 rounded-xl text-purple-300 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="truncate min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                        {cleanTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>Last modified: {formattedDate}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions for this file */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
                    {/* View PDF link if available */}
                    {(f.pdfWebViewLink || f.webViewLink) && (
                      <a
                        href={f.pdfWebViewLink || f.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                        title="View rendered PDF in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden md:inline">View PDF</span>
                      </a>
                    )}

                    {/* Open & Write button */}
                    <button
                      onClick={() => handleOpenNotebook(f)}
                      disabled={isOpening}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50"
                    >
                      {isOpening ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-3.5 h-3.5" />
                          <span>Open & Write</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Files saved in Google Drive folder: <strong className="text-slate-300">OneNote PDF Studio</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
