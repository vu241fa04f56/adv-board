import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  FileUp,
  Grid,
  Columns,
  Maximize2,
  Plus,
  BookOpen,
  ChevronRight,
  Tv,
  LogOut,
  Share2,
  Cloud,
  CloudCheck,
  CloudUpload,
  Eye,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopClose,
  PanelTopOpen,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ViewMode, NotebookData, SectionData, PageData } from '../types';
import { GoogleUser, useAuth } from '../contexts/AuthContext';

interface HeaderBarProps {
  notebook: NotebookData | undefined;
  section: SectionData | undefined;
  page: PageData | undefined;
  viewMode?: ViewMode;
  onSetViewMode?: (mode: ViewMode) => void;
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar: () => void;
  onOpenImportPdfModal: () => void;
  onOpenPageManager: () => void;
  onOpenExportModal: () => void;
  onOpenShareModal?: () => void;
  onToggleReadMode?: () => void;
  totalPages?: number;
  currentPageIndex?: number;
  onSeekPage?: (pageNumber: number) => void;
  user?: GoogleUser | null;
  onLogout?: () => void;
  driveSyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onSaveToDrive?: () => void;
  onOpenDriveModal?: () => void;
  isReadOnly?: boolean;
  isUpperPanelHidden?: boolean;
  onToggleUpperPanel?: () => void;
  onHideBothPanels?: () => void;
  onShowBothPanels?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  notebook,
  section,
  page,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenImportPdfModal,
  onOpenPageManager,
  onOpenExportModal,
  onOpenShareModal,
  onToggleReadMode,
  totalPages,
  currentPageIndex,
  user,
  onLogout,
  driveSyncStatus = 'idle',
  onSaveToDrive,
  onOpenDriveModal,
  isReadOnly,
  isUpperPanelHidden,
  onToggleUpperPanel,
  onHideBothPanels,
  onShowBothPanels,
}) => {
  const { isOnline, driveToken, promptGoogleLoginAndDrive } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleDriveSaveClick = () => {
    if (!isOnline) {
      alert('You are currently offline. Internet connection is required to sync with Google Drive. All your drawings and notebooks are saved locally in browser storage.');
      return;
    }
    onSaveToDrive?.();
  };

  const handleDriveOpenClick = () => {
    if (!isOnline) {
      alert('You are currently offline. Internet connection is required to browse Google Drive. You can open local files anytime.');
      return;
    }
    onOpenDriveModal?.();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-10.5 bg-gradient-to-b from-purple-900 via-purple-950 to-purple-950 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 text-white px-3 flex items-center justify-between border-b border-purple-800/80 dark:border-slate-800 select-none shadow-md relative z-40">
      {/* Left: Sidebar Toggle Icon Button & Breadcrumbs */}
      <div className="flex items-center space-x-2 truncate">
        {/* Sleek 3D Toggle Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleSidebar}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
              isSidebarOpen
                ? 'bg-gradient-to-b from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 text-purple-100 border-purple-600/80 shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300 shadow-[0_2px_5px_rgba(245,158,11,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] animate-pulse'
            }`}
            title={isSidebarOpen ? "Remove / Collapse Left Section (Ctrl+\\)" : "Bring Back Left Section (Ctrl+\\)"}
          >
            {isSidebarOpen ? (
              <>
                <PanelLeftClose className="w-4 h-4 text-purple-200" />
                <span className="hidden sm:inline text-[11px] font-semibold">Hide Side Panel</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-4 h-4 text-slate-950" />
                <span className="inline text-[11px] font-extrabold">Show Side Panel</span>
              </>
            )}
          </button>

          {/* Button to remove BOTH side & upper panels simultaneously */}
          {onHideBothPanels && (
            <button
              onClick={onHideBothPanels}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border border-purple-600/80 bg-gradient-to-b from-purple-900 to-purple-950 hover:from-purple-800 hover:to-purple-900 text-purple-200 shadow-sm active:translate-y-[1px]"
              title="Hide side panel and upper panel simultaneously (Ctrl+Shift+H)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline text-[11px]">Hide Both Panels</span>
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-purple-200 dark:text-slate-300 truncate">
          <span className="font-bold text-white flex items-center space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-purple-300" />
            <span className="truncate">{notebook?.title || 'OneNote Studio'}</span>
          </span>
          {section && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate">{section.title}</span>
            </>
          )}
          {page && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-purple-300 dark:text-purple-400 font-semibold truncate">
                {page.title}
              </span>
            </>
          )}
          {totalPages && totalPages > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700 text-purple-200 text-[11px] font-mono font-bold">
              {currentPageIndex || 1} / {totalPages}
            </span>
          )}
          {!isOnline && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1" title="Offline mode active. Notebooks & drawings saved locally.">
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>Offline</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle: Undo/Redo + Zoom Controls (Compact 3D Buttons) */}
      <div className="flex items-center space-x-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-purple-950/80 dark:bg-slate-900 border border-purple-800/80 dark:border-slate-800 rounded-lg p-0.5 shadow-inner">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 hover:bg-purple-800 dark:hover:bg-slate-800 disabled:opacity-30 rounded text-purple-100 transition-all active:scale-95"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 hover:bg-purple-800 dark:hover:bg-slate-800 disabled:opacity-30 rounded text-purple-100 transition-all active:scale-95"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-purple-950/80 dark:bg-slate-900 border border-purple-800/80 dark:border-slate-800 rounded-lg px-2 py-0.5 text-xs shadow-inner">
          <button
            onClick={onZoomOut}
            className="p-0.5 hover:bg-purple-800 rounded text-purple-200 active:scale-95 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomReset}
            className="font-mono text-[11px] px-1 hover:text-purple-300 font-bold"
            title="Reset Zoom 100%"
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="p-0.5 hover:bg-purple-800 rounded text-purple-200 active:scale-95 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Quick Action Buttons (Compact 3D Styling) */}
      <div className="flex items-center space-x-1.5">
        {/* Read / Projector Mode Button */}
        {onToggleReadMode && (
          <button
            onClick={onToggleReadMode}
            className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border border-indigo-400/50 text-white rounded-lg text-xs font-bold transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] active:translate-y-[1px]"
            title="Read / Projector Mode (Hide and lock toolbars for projector presentation)"
          >
            <Tv className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden md:inline">Read Mode</span>
          </button>
        )}

        {/* Inserter / Page Manager Button */}
        <button
          onClick={onOpenPageManager}
          className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-b from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 border border-purple-600/60 rounded-lg text-xs font-semibold text-white transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] active:translate-y-[1px]"
          title="Insert Pages between existing ones"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden lg:inline">Insert Page</span>
        </button>

        {/* PDF Import */}
        <button
          onClick={onOpenImportPdfModal}
          className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-b from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 border border-purple-500/60 rounded-lg text-xs font-semibold text-white transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] active:translate-y-[1px]"
          title="Put / Import PDF"
        >
          <FileUp className="w-3 h-3" />
          <span className="hidden sm:inline">Import PDF</span>
        </button>

        {/* Share Notebook Button */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/60 text-white rounded-lg text-xs font-bold transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] active:translate-y-[1px]"
            title="Share Notebook (Generate view-only link)"
          >
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Google Drive Save & Open Buttons */}
        {onSaveToDrive && (
          <div className="flex items-center space-x-1">
            <button
              onClick={handleDriveSaveClick}
              disabled={driveSyncStatus === 'saving'}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                driveSyncStatus === 'saving'
                  ? 'bg-blue-800 text-blue-200 cursor-wait border-blue-600'
                  : driveSyncStatus === 'saved'
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-400/60 text-white'
                  : driveSyncStatus === 'error'
                  ? 'bg-gradient-to-b from-red-700 to-red-800 text-white border-red-500'
                  : 'bg-gradient-to-b from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 border-blue-500/60 text-white'
              } shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]`}
              title="Save Notebook into Google Drive account (Colab-style)"
            >
              {driveSyncStatus === 'saving' ? (
                <>
                  <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : driveSyncStatus === 'saved' ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>

            {onOpenDriveModal && (
              <button
                onClick={handleDriveOpenClick}
                className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-b from-blue-900 to-blue-950 hover:from-blue-800 hover:to-blue-900 text-blue-200 border border-blue-600/50 rounded-lg text-xs font-bold transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] active:translate-y-[1px]"
                title="Open saved notebook from Google Drive"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-300" />
                <span className="hidden lg:inline">Open</span>
              </button>
            )}
          </div>
        )}

        {/* Hide Upper Panel Button */}
        {onToggleUpperPanel && (
          <button
            onClick={onToggleUpperPanel}
            className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-b from-purple-800 to-purple-950 hover:from-purple-700 hover:to-purple-900 border border-purple-500/60 text-purple-100 hover:text-white rounded-lg text-xs font-bold transition-all shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] active:translate-y-[1px]"
            title="Hide Upper Panel / Collapse Header & Ribbon (Ctrl+Shift+U)"
          >
            <PanelTopClose className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Hide Top Panel</span>
          </button>
        )}

        {/* Download / Export */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border border-amber-200 text-slate-950 rounded-lg text-xs font-extrabold transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[1px]"
          title="Download / Export to Local Storage"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export</span>
        </button>

        {user && onLogout && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center space-x-1.5 pl-1 pr-1.5 py-0.5 rounded-full hover:bg-purple-800/80 dark:hover:bg-slate-800 transition-colors border border-purple-700/50"
              title={user.email}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border border-purple-400/50 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline text-[11px] font-medium text-purple-100 max-w-[80px] truncate">
                {user.givenName || user.name.split(" ")[0]}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-1 border-b border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      promptGoogleLoginAndDrive();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      <span>{driveToken ? 'Google Drive Syncing' : 'Connect Google Drive'}</span>
                    </div>
                    {driveToken && <CloudCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

