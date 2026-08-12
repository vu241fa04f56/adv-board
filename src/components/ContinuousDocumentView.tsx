import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PageData, ToolSettings, Annotation, PaperTemplate } from '../types';
import { CanvasWorkspace } from './CanvasWorkspace';
import {
  Plus,
  FileUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileText,
  Search,
  Zap
} from 'lucide-react';

interface ContinuousDocumentViewProps {
  pages: PageData[];
  settings: ToolSettings;
  zoomScale: number;
  activePageId: string;
  isReadMode?: boolean;
  onSelectPage: (id: string) => void;
  onUpdatePageAnnotations: (pageId: string, newAnnotations: Annotation[]) => void;
  onInsertPageAt: (index: number, title: string, template: PaperTemplate) => void;
  onOpenImportPdfForInsert: (index: number) => void;
}

export const ContinuousDocumentView: React.FC<ContinuousDocumentViewProps> = ({
  pages,
  settings,
  zoomScale,
  activePageId,
  isReadMode = false,
  onSelectPage,
  onUpdatePageAnnotations,
  onInsertPageAt,
  onOpenImportPdfForInsert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePageIndex, setVisiblePageIndex] = useState<number>(1);
  const visiblePageIndexRef = useRef(1);
  const pageHeightRef = useRef(0);
  const activePageIdRef = useRef(activePageId);
  const [seekInput, setSeekInput] = useState<string>('1');
  const [showAddTemplateMenu, setShowAddTemplateMenu] = useState<boolean>(false);
  const [isTypingSeek, setIsTypingSeek] = useState<boolean>(false);

  // Approximate height per page block (canvas + spacing + insert bar)
  // Keep the virtual list cheap: one fixed slot per page, while only a tiny
  // window of real CanvasWorkspace instances exists in the DOM.
  const PAGE_HEIGHT = Math.max(520, Math.round(1100 * zoomScale) + 110);
  pageHeightRef.current = PAGE_HEIGHT;
  activePageIdRef.current = activePageId;

  // Sync seek input with visible index
  useEffect(() => {
    if (!isTypingSeek) {
      setSeekInput(visiblePageIndex.toString());
    }
  }, [visiblePageIndex, isTypingSeek]);

  // Handle Scroll on parent <main> container. The listener is installed once
  // per container/zoom configuration and uses refs so scrolling never causes
  // a listener teardown/rebuild on every page.
  useEffect(() => {
    const parentEl = containerRef.current?.parentElement;
    if (!parentEl || pages.length === 0) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const slot = pageHeightRef.current || PAGE_HEIGHT;
        const nextIndex = Math.min(
          pages.length,
          Math.max(1, Math.floor((parentEl.scrollTop + slot * 0.28) / slot) + 1)
        );

        if (nextIndex !== visiblePageIndexRef.current) {
          visiblePageIndexRef.current = nextIndex;
          setVisiblePageIndex(nextIndex);
          const currentPg = pages[nextIndex - 1];
          if (currentPg && currentPg.id !== activePageIdRef.current) {
            onSelectPage(currentPg.id);
          }
        }
      });
    };

    parentEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      parentEl.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [pages.length, PAGE_HEIGHT, onSelectPage]);

  // If a page is selected from the sidebar/page manager, jump directly to it.
  // This avoids rendering or scrolling through thousands of intermediate pages.
  useEffect(() => {
    const idx = pages.findIndex((p) => p.id === activePageId);
    if (idx < 0) return;
    const nextIndex = idx + 1;
    if (nextIndex === visiblePageIndexRef.current) return;

    visiblePageIndexRef.current = nextIndex;
    setVisiblePageIndex(nextIndex);
    setSeekInput(String(nextIndex));

    const parentEl = containerRef.current?.parentElement;
    if (parentEl) {
      parentEl.scrollTo({ top: idx * PAGE_HEIGHT, behavior: 'auto' });
    }
  }, [activePageId, pages, PAGE_HEIGHT]);

  // Fast scroll jump to specific page number
  const scrollToPageIndex = useCallback(
    (targetPageNumber: number) => {
      const clamped = Math.max(1, Math.min(pages.length, targetPageNumber));
      const parentEl = containerRef.current?.parentElement;

      visiblePageIndexRef.current = clamped;
      setVisiblePageIndex(clamped);
      setSeekInput(clamped.toString());

      const targetPage = pages[clamped - 1];
      if (targetPage) {
        onSelectPage(targetPage.id);
      }

      if (parentEl) {
        const targetScrollTop = (clamped - 1) * PAGE_HEIGHT;
        parentEl.scrollTo({ top: targetScrollTop, behavior: 'auto' });
      }
    },
    [pages, PAGE_HEIGHT, onSelectPage]
  );

  // Seek Form Submit
  const handleSeekSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTypingSeek(false);
    const parsed = parseInt(seekInput, 10);
    if (!isNaN(parsed)) {
      scrollToPageIndex(parsed);
    } else {
      setSeekInput(visiblePageIndex.toString());
    }
  };

  // Virtual Window Calculation
  const WINDOW_SIZE = pages.length > 500 ? 2 : 3; // Tiny render window for huge documents
  const currentZeroIdx = visiblePageIndex - 1;
  const startIdx = Math.max(0, currentZeroIdx - WINDOW_SIZE);
  const endIdx = Math.min(pages.length - 1, currentZeroIdx + WINDOW_SIZE);
  const visiblePages = useMemo(() => pages.slice(startIdx, endIdx + 1), [pages, startIdx, endIdx]);

  const topSpacerHeight = startIdx * PAGE_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (pages.length - 1 - endIdx) * PAGE_HEIGHT);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center py-6 min-h-full pb-28 select-none">
      {/* Sticky Floating Page Navigator & Rapid Seek Toolbar */}
      <div className="sticky top-4 z-30 flex items-center bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-purple-500/40 dark:border-purple-800/80 rounded-full px-4 py-2 text-white shadow-2xl space-x-3 transition-all hover:border-purple-500">
        <button
          onClick={() => scrollToPageIndex(visiblePageIndex - 1)}
          disabled={visiblePageIndex <= 1}
          className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded-full transition-colors text-purple-300"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handleSeekSubmit} className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Page</span>
          <input
            type="number"
            min={1}
            max={pages.length}
            value={seekInput}
            onFocus={() => setIsTypingSeek(true)}
            onBlur={() => {
              setIsTypingSeek(false);
              const parsed = parseInt(seekInput, 10);
              if (!isNaN(parsed) && parsed >= 1 && parsed <= pages.length) {
                scrollToPageIndex(parsed);
              } else {
                setSeekInput(visiblePageIndex.toString());
              }
            }}
            onChange={(e) => setSeekInput(e.target.value)}
            className="w-16 bg-slate-800 border border-purple-500/50 rounded-lg px-2 py-0.5 text-center text-xs font-mono font-bold text-white focus:outline-hidden focus:border-purple-400"
            title="Type desired page number to jump directly"
          />
          <span className="text-xs font-mono font-bold text-purple-300">
            / {pages.length}
          </span>
          <button
            type="submit"
            className="p-1 text-purple-400 hover:text-purple-200 transition-colors"
            title="Jump to Page"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <button
          onClick={() => scrollToPageIndex(visiblePageIndex + 1)}
          disabled={visiblePageIndex >= pages.length}
          className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded-full transition-colors text-purple-300"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-700" />

        {/* Rapid Jump Presets for Huge PDFs (>100 pages) */}
        {pages.length > 50 && (
          <div className="hidden lg:flex items-center space-x-1 text-[11px] font-mono">
            {[0.25, 0.5, 0.75].map((fraction) => {
              const targetP = Math.round(pages.length * fraction);
              return (
                <button
                  key={fraction}
                  type="button"
                  onClick={() => scrollToPageIndex(targetP)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-purple-900 text-purple-300 hover:text-white border border-slate-700 transition-colors"
                >
                  P.{targetP}
                </button>
              );
            })}
          </div>
        )}

        {/* Add Page Button */}
        <div className="relative">
          <button
            onClick={() => setShowAddTemplateMenu(!showAddTemplateMenu)}
            className="flex items-center space-x-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-bold transition-all shadow-xs"
            title="Add new page directly after current page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Page</span>
          </button>

          {showAddTemplateMenu && (
            <div className="absolute top-full mt-2 right-0 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-slate-100 animate-in fade-in zoom-in-95">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-2 px-1">
                Insert After Page {visiblePageIndex}
              </div>
              <div className="space-y-1 mb-2">
                {[
                  { id: 'grid', label: 'Grid / Math Paper' },
                  { id: 'ruled', label: 'Ruled Notebook Paper' },
                  { id: 'dotted', label: 'Dotted Grid' },
                  { id: 'blank', label: 'Plain Blank Paper' },
                  { id: 'music', label: 'Music Staff Lines' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      onInsertPageAt(visiblePageIndex, `Page ${visiblePageIndex + 1}`, tpl.id as PaperTemplate);
                      setShowAddTemplateMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-purple-900/60 hover:text-white flex items-center justify-between text-slate-300 transition-colors"
                  >
                    <span>{tpl.label}</span>
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowAddTemplateMenu(false);
                    onOpenImportPdfForInsert(visiblePageIndex);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-800/80 flex items-center space-x-2 transition-colors font-semibold"
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Insert PDF Document Here</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOP SPACER (Virtual unrendered pages prior to window) */}
      {topSpacerHeight > 0 && (
        <div
          style={{ height: `${topSpacerHeight}px` }}
          className="w-full flex items-center justify-center my-2 pointer-events-none"
        >
          <div className="bg-slate-900/90 border border-purple-900/50 text-purple-300 text-xs px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Fast Virtual Scroll: {startIdx} earlier pages</span>
          </div>
        </div>
      )}

      {/* RENDER ONLY VISIBLE WINDOW OF PAGES */}
      {visiblePages.map((page, relIdx) => {
        const actualIdx = startIdx + relIdx;
        const pageNum = actualIdx + 1;

        return (
          <React.Fragment key={page.id}>
            <div
              id={`page-card-${page.id}`}
              className={`pdf-page-shell flex flex-col items-center my-4 ${
                page.id === activePageId ? 'ring-2 ring-purple-500/60 rounded-2xl p-2 bg-purple-950/20' : 'p-2'
              }`}
              style={{
                contentVisibility: 'auto',
                contain: 'layout paint style',
                containIntrinsicSize: `${PAGE_HEIGHT}px`,
              }}
            >
              {/* Header Badge */}
              <div className="mb-2 text-xs font-mono font-semibold text-slate-400 flex items-center space-x-2 bg-slate-800/80 dark:bg-slate-900/90 border border-slate-700/80 rounded-full px-3.5 py-1 shadow-sm">
                <span className="text-purple-400 font-bold">
                  Page {pageNum} of {pages.length}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-200 truncate max-w-xs">{page.title}</span>
                {page.pdfPageNumber && (
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.2 rounded-full">
                    PDF P.{page.pdfPageNumber}
                  </span>
                )}
              </div>

              {/* Active Interactive Canvas */}
              <CanvasWorkspace
                page={page}
                settings={settings}
                zoomScale={zoomScale}
                isReadMode={isReadMode}
                onUpdateAnnotations={(annos) => onUpdatePageAnnotations(page.id, annos)}
              />
            </div>

            {/* Inline Insert Divider */}
            <div className="flex items-center space-x-3 my-2 w-full max-w-xl">
              <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1" />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onInsertPageAt(pageNum, `Page ${pageNum + 1}`, 'grid')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-full border border-purple-500/40 hover:border-purple-400 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 text-[11px] font-semibold shadow-xs transition-all hover:scale-105"
                >
                  <Plus className="w-3 h-3 text-purple-500" />
                  <span>Insert Blank Page</span>
                </button>
              </div>
              <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1" />
            </div>
          </React.Fragment>
        );
      })}

      {/* BOTTOM SPACER (Virtual unrendered pages after window) */}
      {bottomSpacerHeight > 0 && (
        <div
          style={{ height: `${bottomSpacerHeight}px` }}
          className="w-full flex items-center justify-center my-2 pointer-events-none"
        >
          <div className="bg-slate-900/90 border border-purple-900/50 text-purple-300 text-xs px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Fast Virtual Scroll: {pages.length - 1 - endIdx} remaining pages</span>
          </div>
        </div>
      )}
    </div>
  );
};

