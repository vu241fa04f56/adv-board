import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  FileText,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  X,
  Check,
} from 'lucide-react';
import { NotebookData, SectionData, PageData } from '../types';

interface SidebarProps {
  notebooks: NotebookData[];
  sections: SectionData[];
  activeNotebookId: string;
  activeSectionId: string;
  activePageId: string;
  onSelectNotebook: (id: string) => void;
  onSelectSection: (id: string) => void;
  onSelectPage: (id: string) => void;
  onCreateNotebook: (title: string, color: string) => void;
  onRenameNotebook: (id: string, newTitle: string) => void;
  onCreateSection: (notebookId: string, title: string, color: string) => void;
  onCreatePage: (sectionId: string, title: string) => void;
  onDeleteNotebook: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onDeletePage: (sectionId: string, pageId: string) => void;
  onOpenImportPdfModal: () => void;
  onOpenPageManager: () => void;
  onOpenDriveModal?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_COLORS = [
  '#7C3AED', // Purple
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#E11D48', // Rose
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
];

export const Sidebar: React.FC<SidebarProps> = ({
  notebooks,
  sections,
  activeNotebookId,
  activeSectionId,
  activePageId,
  onSelectNotebook,
  onSelectSection,
  onSelectPage,
  onCreateNotebook,
  onRenameNotebook,
  onCreateSection,
  onCreatePage,
  onDeleteNotebook,
  onDeleteSection,
  onDeletePage,
  onOpenImportPdfModal,
  onOpenPageManager,
  onOpenDriveModal,
  isOpen,
  onClose,
}) => {
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);

  const [isEditingNotebook, setIsEditingNotebook] = useState(false);
  const [editNotebookTitle, setEditNotebookTitle] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(SECTION_COLORS[0]);
  const [pageSearch, setPageSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(60);

  const activeNotebook = notebooks.find((nb) => nb.id === activeNotebookId);
  const activeNotebookSections = sections.filter((s) => s.notebookId === activeNotebookId);
  const activeSection = sections.find((s) => s.id === activeSectionId);

  const allPages = activeSection?.pages || [];
  const filteredPages = pageSearch.trim()
    ? allPages.filter((p, idx) =>
        p.title.toLowerCase().includes(pageSearch.toLowerCase()) ||
        (idx + 1).toString() === pageSearch.trim()
      )
    : allPages;

  const displayedPages = filteredPages.slice(0, displayLimit);

  const handleSaveNotebookRename = () => {
    if (!activeNotebookId || !editNotebookTitle.trim()) return;
    onRenameNotebook(activeNotebookId, editNotebookTitle.trim());
    setIsEditingNotebook(false);
  };

  const handleAddNotebookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNotebook(newTitle.trim(), newColor);
    setNewTitle('');
    setShowNewNotebookModal(false);
  };

  const handleAddSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeNotebookId) return;
    onCreateSection(activeNotebookId, newTitle.trim(), newColor);
    setNewTitle('');
    setShowNewSectionModal(false);
  };

  const handleAddPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeSectionId) return;
    onCreatePage(activeSectionId, newTitle.trim());
    setNewTitle('');
    setShowNewPageModal(false);
  };

  return (
    <div
      className={`fixed md:relative inset-y-0 left-0 z-40 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-all duration-200 ease-in-out shrink-0 ${
        isOpen
          ? 'w-80 opacity-100 translate-x-0'
          : 'w-0 opacity-0 -translate-x-full overflow-hidden border-r-0 pointer-events-none'
      }`}
    >
      {/* Header: Notebook Selection & Actions */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-1">
        <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
          <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
          {isEditingNotebook ? (
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <input
                type="text"
                value={editNotebookTitle}
                onChange={(e) => setEditNotebookTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNotebookRename();
                  if (e.key === 'Escape') setIsEditingNotebook(false);
                }}
                autoFocus
                placeholder="Notebook Title..."
                className="bg-slate-950 border border-purple-500 rounded-md px-2 py-1 text-xs font-bold text-white outline-hidden w-full font-sans"
              />
              <button
                onClick={handleSaveNotebookRename}
                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-md transition-colors shrink-0"
                title="Save Notebook Name"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditingNotebook(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="truncate flex-1 min-w-0">
              <select
                id="select-active-notebook"
                value={activeNotebookId}
                onChange={(e) => onSelectNotebook(e.target.value)}
                className="bg-slate-800 text-slate-100 font-bold text-sm rounded-lg px-2 py-1 outline-hidden border border-slate-700 cursor-pointer w-full truncate"
              >
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.id}>
                    {nb.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!isEditingNotebook && (
          <div className="flex items-center space-x-0.5 shrink-0">
            {/* Edit / Pen Icon */}
            <button
              onClick={() => {
                if (activeNotebook) {
                  setEditNotebookTitle(activeNotebook.title);
                  setIsEditingNotebook(true);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Rename Active Notebook (Pen)"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete / Dustbin Icon */}
            <button
              onClick={() => {
                const targetId = activeNotebook?.id || activeNotebookId;
                if (targetId) {
                  onDeleteNotebook(targetId);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Delete Active Notebook"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Add New Notebook Button */}
            <button
              onClick={() => {
                setNewTitle('');
                setShowNewNotebookModal(true);
              }}
              className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors ml-0.5"
              title="Create New Notebook"
            >
              <Plus className="w-4 h-4" />
            </button>


          </div>
        )}
      </div>

      {/* Sections Tab Bar */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between px-2 mb-1.5 text-xs text-slate-400 uppercase font-semibold tracking-wider">
          <span>Sections</span>
          <button
            onClick={() => {
              setNewTitle('');
              setShowNewSectionModal(true);
            }}
            className="text-purple-400 hover:text-purple-300 flex items-center space-x-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="flex flex-col space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {activeNotebookSections.map((sec) => (
            <div
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                sec.id === activeSectionId
                  ? 'bg-slate-800 text-white shadow-xs border-l-4'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
              style={{
                borderLeftColor: sec.id === activeSectionId ? sec.color || '#7C3AED' : 'transparent',
              }}
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: sec.color || '#7C3AED' }}
                />
                <span className="truncate">{sec.title}</span>
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                {activeNotebookSections.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(sec.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-0.5"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <div className="flex items-center justify-between px-2 mb-2 text-xs text-slate-400 uppercase font-semibold tracking-wider">
          <span>Pages ({activeSection?.pages?.length || 0})</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setNewTitle('');
                setShowNewPageModal(true);
              }}
              className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 text-xs"
              title="Add New Blank Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Page</span>
            </button>
          </div>
        </div>

        {/* Search / Filter for Pages if page count > 15 */}
        {allPages.length > 15 && (
          <div className="mb-2 px-1">
            <input
              type="text"
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              placeholder="Search or jump to page #..."
              className="w-full bg-slate-800 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 font-mono"
            />
          </div>
        )}

        {/* List of Pages in active Section */}
        <div className="space-y-1">
          {displayedPages.map((pg) => {
            const actualIdx = allPages.findIndex((p) => p.id === pg.id);
            return (
              <div
                key={pg.id}
                onClick={() => onSelectPage(pg.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  pg.id === activePageId
                    ? 'bg-purple-900/60 text-white font-semibold border border-purple-700 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-[10px] text-slate-500 font-mono w-6 text-right shrink-0">
                    {actualIdx >= 0 ? actualIdx + 1 : ''}.
                  </span>
                  <FileText
                    className={`w-4 h-4 shrink-0 ${
                      pg.pdfId ? 'text-amber-400' : 'text-purple-400'
                    }`}
                  />
                  <span className="truncate">{pg.title}</span>
                </div>

                {allPages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeSection) {
                        onDeletePage(activeSection.id, pg.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-opacity"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {filteredPages.length > displayLimit && (
            <button
              onClick={() => setDisplayLimit((prev) => prev + 100)}
              className="w-full py-2 text-center text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 rounded-lg border border-purple-800/50 my-2 transition-colors"
            >
              + Load {filteredPages.length - displayLimit} more pages
            </button>
          )}
        </div>
      </div>

      {/* Footer: App Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>OneNote PDF Studio</span>
        <span className="text-purple-400 font-mono">v1.0</span>
      </div>

      {/* Modal: New Notebook */}
      {showNewNotebookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNotebookSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Create New Notebook</h3>
              <button
                type="button"
                onClick={() => setShowNewNotebookModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notebook Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Organic Chemistry Notes"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewNotebookModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Section */}
      {showNewSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSectionSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Add New Section</h3>
              <button
                type="button"
                onClick={() => setShowNewSectionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Section Name</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Chapter 1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Section Color</label>
                <div className="flex space-x-2">
                  {SECTION_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        newColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewSectionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Page */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddPageSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Add Blank Page</h3>
              <button
                type="button"
                onClick={() => setShowNewPageModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Page Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Lecture Notes Page"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewPageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
