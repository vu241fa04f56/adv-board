import React, { useState } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Shapes,
  Type,
  Hand,
  ChevronDown,
  Sparkles,
  Grid,
  Square,
  Circle,
  ArrowRight,
  Maximize2,
  Trash2,
  Check,
  ShieldCheck,
  Image,
  PaintBucket,
  Table as TableIcon,
  Tv,
  SlidersHorizontal,
  Minus,
  Plus,
  BoxSelect,
  X,
  ChevronUp,
  PanelTopClose,
  PanelTopOpen,
  Undo2,
  Redo2,
} from 'lucide-react';
import { ToolSettings, ToolType, ShapeType, PaperTemplate } from '../types';

interface StylusToolbarProps {
  settings: ToolSettings;
  onUpdateSettings: (newSettings: Partial<ToolSettings>) => void;
  onClearPageAnnotations: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onInsertTable?: (rows: number, cols: number) => void;
  onInsertImage?: (dataUrl: string) => void;
  onToggleReadMode?: () => void;
  isUpperPanelHidden?: boolean;
  onToggleUpperPanel?: () => void;
  onHideBothPanels?: () => void;
  onShowBothPanels?: () => void;
}

interface PenSlot {
  color: string;
  width: number;
  label: string;
}

const ONENOTE_COLORS = [
  '#EAB308', '#F97316', '#EF4444', '#EC4899',
  '#A855F7', '#6366F1', '#3B82F6', '#0284C7',
  '#06B6D4', '#10B981', '#22C55E', '#84CC16',
  '#000000', '#475569', '#94A3B8', '#FFFFFF',
  '#78350F', '#831843', '#1E3A8A', '#064E3B'
];

const ONENOTE_DOT_WIDTHS = [1, 2, 3, 5, 8, 12, 16, 20];

const HIGHLIGHTER_COLORS = [
  { color: '#FEF08A', hex: '#FEF08A', label: 'Yellow' },
  { color: '#86EFAC', hex: '#86EFAC', label: 'Neon Green' },
  { color: '#93C5FD', hex: '#93C5FD', label: 'Sky Blue' },
  { color: '#F472B6', hex: '#F472B6', label: 'Hot Pink' },
  { color: '#C084FC', hex: '#C084FC', label: 'Lavender' },
  { color: '#FDBA74', hex: '#FDBA74', label: 'Orange' },
  { color: '#6EE7B7', hex: '#6EE7B7', label: 'Mint' },
  { color: '#67E8F9', hex: '#67E8F9', label: 'Cyan' },
  { color: '#FDA4AF', hex: '#FDA4AF', label: 'Coral' },
  { color: '#E9D5FF', hex: '#E9D5FF', label: 'Lilac' },
  { color: '#FDE047', hex: '#FDE047', label: 'Lemon' },
  { color: '#FFFFFF', hex: '#FFFFFF', label: 'White / Clear' },
];

const FILL_COLORS = [
  'transparent',
  '#FFFFFF',
  '#FEF08A',
  '#BAE6FD',
  '#BBF7D0',
  '#FBCFE8',
  '#E9D5FF',
  '#F1F5F9',
  '#FED7AA',
  '#334155',
  '#000000',
];

// Pen Swatch Grid matching Attachment 3
const PEN_SWATCH_GRID = [
  // Row 1
  { color: '#FACC15', label: 'Gold Yellow' },
  { color: '#EA580C', label: 'Deep Orange' },
  { color: '#EC4899', label: 'Hot Pink' },
  { color: '#EF4444', label: 'Bright Red' },
  // Row 2
  { color: '#8B5CF6', label: 'Purple' },
  { color: '#A855F7', label: 'Violet' },
  { color: '#D946EF', label: 'Magenta' },
  { color: '#1E40AF', label: 'Royal Blue' },
  // Row 3
  { color: '#0EA5E9', label: 'Sky Blue' },
  { color: '#06B6D4', label: 'Cyan' },
  { color: '#10B981', label: 'Emerald' },
  { color: '#84CC16', label: 'Lime' },
  // Row 4
  { color: '#000000', label: 'Black' },
  { color: '#334155', label: 'Charcoal' },
  { color: '#94A3B8', label: 'Slate Gray' },
  { color: '#FFFFFF', label: 'White' },
  // Row 5 (Special gradients / texture swatches)
  { color: 'linear-gradient(135deg, #f59e0b, #ec4899, #3b82f6)', hex: '#ec4899', label: 'Rainbow' },
  { color: 'radial-gradient(circle, #a855f7, #1e1b4b)', hex: '#a855f7', label: 'Galaxy' },
  { color: 'radial-gradient(circle, #ef4444, #7f1d1d)', hex: '#ef4444', label: 'Fire' },
  { color: 'radial-gradient(circle, #06b6d4, #064e3b)', hex: '#06b6d4', label: 'Ocean' },
  // Row 6
  { color: '#FBCFE8', label: 'Peach' },
  { color: '#EAB308', label: 'Gold' },
  { color: '#BAE6FD', label: 'Ice' },
  { color: '#D97706', label: 'Bronze' },
];

interface PenCustomizerPopoverProps {
  slot: PenSlot;
  onUpdateSlot: (updates: { color?: string; width?: number }) => void;
  onClose: () => void;
}

const PenCustomizerPopover: React.FC<PenCustomizerPopoverProps> = ({ slot, onUpdateSlot, onClose }) => {
  return (
    <div className="absolute top-full left-0 mt-2 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl z-[100] w-64 animate-in fade-in zoom-in-95 select-none">
      {/* Top Header & Live Stroke Preview Bar */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
          {slot.label} Settings
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Live Preview Line Bar at top */}
      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl mb-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center h-7 overflow-hidden shadow-inner">
        <div
          className="w-full rounded-full transition-all"
          style={{
            height: `${Math.max(1.5, Math.min(16, slot.width))}px`,
            background: slot.color,
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* Thickness Selector Bar ( -  .  •  ⦿  ●  ⬤  + ) */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 mb-3.5">
        <button
          onClick={() => onUpdateSlot({ width: Math.max(1, slot.width - 1) })}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          title="Decrease Size"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center space-x-2">
          {[1, 2, 4, 8, 12].map((w) => {
            const isSelected = slot.width === w;
            return (
              <button
                key={w}
                onClick={() => onUpdateSlot({ width: w })}
                className="p-0.5 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                title={`${w}px`}
              >
                <div
                  className={`rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-purple-600 dark:ring-purple-400 ring-offset-2 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    width: 10 + w * 0.5,
                    height: 10 + w * 0.5,
                    background: isSelected ? (slot.color.startsWith('linear') || slot.color.startsWith('radial') ? '#a855f7' : slot.color) : '#64748b',
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onUpdateSlot({ width: Math.min(30, slot.width + 1) })}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          title="Increase Size"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4-column x 6-row Color Grid */}
      <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin mb-2">
        {PEN_SWATCH_GRID.map((swatch, idx) => {
          const swatchValue = swatch.hex || swatch.color;
          const isSelected = slot.color.toLowerCase() === swatchValue.toLowerCase();
          return (
            <button
              key={idx}
              onClick={() => onUpdateSlot({ color: swatchValue })}
              className={`w-9 h-9 rounded-full border border-slate-300/80 dark:border-slate-700/80 flex items-center justify-center shadow-xs transition-all hover:scale-110 active:scale-95 ${
                isSelected
                  ? 'ring-2 ring-purple-600 dark:ring-purple-400 ring-offset-2 scale-110 shadow-md'
                  : 'hover:border-purple-400/80'
              }`}
              style={{ background: swatch.color }}
              title={swatch.label}
            >
              {isSelected && <Check className={`w-4 h-4 font-bold drop-shadow ${swatchValue === '#FFFFFF' ? 'text-slate-900' : 'text-white'}`} />}
            </button>
          );
        })}
      </div>

      {/* Custom Color Picker */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Custom Pen Color</span>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={slot.color.startsWith('#') ? slot.color : '#000000'}
            onChange={(e) => onUpdateSlot({ color: e.target.value })}
            className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0 bg-transparent"
          />
          <span className="text-xs font-mono text-slate-500 uppercase">{slot.color.startsWith('#') ? slot.color : 'Custom'}</span>
        </div>
      </div>
    </div>
  );
};

interface HighlighterCustomizerPopoverProps {
  color: string;
  width: number;
  onUpdate: (updates: { highlighterColor?: string; highlighterWidth?: number }) => void;
  onClose: () => void;
}

const HighlighterCustomizerPopover: React.FC<HighlighterCustomizerPopoverProps> = ({
  color,
  width,
  onUpdate,
  onClose,
}) => {
  return (
    <div className="absolute top-full left-0 mt-2 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl z-[100] w-64 animate-in fade-in zoom-in-95 select-none">
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
          <Highlighter className="w-3.5 h-3.5" />
          <span>Highlighter Settings</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stroke Preview Bar */}
      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl mb-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center h-8 overflow-hidden shadow-inner">
        <div
          className="w-full rounded-full transition-all opacity-85"
          style={{
            height: `${Math.max(3, Math.min(22, width / 2))}px`,
            backgroundColor: color,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* Thickness Selector */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
          <span>Highlighter Width</span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{width}px</span>
        </div>
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 mb-1">
          <button
            onClick={() => onUpdate({ highlighterWidth: Math.max(6, width - 2) })}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
            title="Smaller"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center space-x-2">
            {[8, 14, 22, 32, 45].map((w) => (
              <button
                key={w}
                onClick={() => onUpdate({ highlighterWidth: w })}
                className={`p-0.5 rounded-full transition-transform ${
                  width === w ? 'ring-2 ring-amber-500 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                title={`${w}px`}
              >
                <div
                  className="rounded-full bg-amber-500"
                  style={{ width: 8 + w * 0.25, height: 8 + w * 0.25 }}
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => onUpdate({ highlighterWidth: Math.min(60, width + 2) })}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
            title="Bigger"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          type="range"
          min={6}
          max={60}
          value={width}
          onChange={(e) => onUpdate({ highlighterWidth: Number(e.target.value) })}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg mt-1"
        />
      </div>

      {/* Multiple Color Palette Swatches */}
      <div>
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          Select Color
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {HIGHLIGHTER_COLORS.map((hc, idx) => {
            const isSelected = color.toLowerCase() === hc.hex.toLowerCase();
            return (
              <button
                key={idx}
                onClick={() => onUpdate({ highlighterColor: hc.hex })}
                className={`h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center transition-all hover:scale-105 ${
                  isSelected ? 'ring-2 ring-amber-500 ring-offset-2 scale-105 shadow-md' : 'hover:border-amber-400'
                }`}
                style={{ backgroundColor: hc.hex }}
                title={hc.label}
              >
                {isSelected && <Check className="w-4 h-4 text-slate-900 font-bold" />}
              </button>
            );
          })}
        </div>

        {/* Custom Hex Color Picker */}
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Custom Color</span>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={color.startsWith('#') ? color : '#FEF08A'}
              onChange={(e) => onUpdate({ highlighterColor: e.target.value })}
              className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0 bg-transparent"
            />
            <span className="text-xs font-mono text-slate-500 uppercase">{color}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StylusToolbar: React.FC<StylusToolbarProps> = ({
  settings,
  onUpdateSettings,
  onClearPageAnnotations,
  undo,
  redo,
  canUndo,
  canRedo,
  onInsertTable,
  onInsertImage,
  onToggleReadMode,
  isUpperPanelHidden,
  onToggleUpperPanel,
  onHideBothPanels,
  onShowBothPanels,
}) => {
  const [penSlots, setPenSlots] = useState<PenSlot[]>([
    { color: '#000000', width: 2, label: 'Pen 1' },
    { color: '#1E40AF', width: 3, label: 'Pen 2' },
    { color: '#DC2626', width: 3, label: 'Pen 3' },
  ]);
  const [activePenSlotIndex, setActivePenSlotIndex] = useState<number>(0);

  // Active Ribbon Tab (Draw, View)
  const [activeRibbonTab, setActiveRibbonTab] = useState<'draw' | 'view'>('draw');

  // Popovers
  const [activeMenu, setActiveMenu] = useState<'penPopover' | 'eraserPopover' | 'highlighterPopover' | 'shape' | 'fill' | 'paper' | null>(null);
  const [showAllTools, setShowAllTools] = useState(false);

  const [recentColors, setRecentColors] = useState<string[]>(['#000000', '#1E40AF', '#DC2626']);

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Select a Pen Slot and open its color & thickness dropdown
  const handleSelectPenSlot = (index: number) => {
    const isSameSlot = settings.activeTool === 'pen' && activePenSlotIndex === index;
    setActivePenSlotIndex(index);
    const slot = penSlots[index];
    onUpdateSettings({
      activeTool: 'pen',
      penColor: slot.color,
      penWidth: slot.width,
    });

    if (isSameSlot) {
      setActiveMenu(activeMenu === 'penPopover' ? null : 'penPopover');
    } else {
      setActiveMenu('penPopover');
    }
  };

  // Update current active Pen Slot color or width
  const updateActivePenSlot = (updates: Partial<PenSlot>) => {
    const updatedSlots = [...penSlots];
    const current = updatedSlots[activePenSlotIndex];
    const newSlot = { ...current, ...updates };
    updatedSlots[activePenSlotIndex] = newSlot;
    setPenSlots(updatedSlots);

    if (updates.color) {
      onUpdateSettings({ penColor: updates.color });
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== updates.color);
        return [updates.color!, ...filtered].slice(0, 4);
      });
    }
    if (updates.width) {
      onUpdateSettings({ penWidth: updates.width });
    }
  };

  if (isUpperPanelHidden) {
    return (
      <div className="relative z-30 bg-slate-950/95 border-b border-slate-800/90 shadow-2xl py-2 px-4 flex items-center justify-between select-none">
        {/* Left/Center: ONLY Eraser, Pen 1 2 3, Highlighter */}
        <div className="flex items-center space-x-3 overflow-x-auto py-0.5 scrollbar-none mx-auto sm:mx-0">
          {/* Eraser Button */}
          <div className="relative">
            <button
              id="btn-tool-eraser-compact"
              onClick={() => {
                onUpdateSettings({ activeTool: 'eraser' });
                setActiveMenu(activeMenu === 'eraserPopover' ? null : 'eraserPopover');
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all border shadow-[0_0_12px_rgba(168,85,247,0.4)] active:scale-95 ${
                settings.activeTool === 'eraser'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-600 to-fuchsia-600 text-white border-purple-300'
                  : 'bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-600/70'
              }`}
              title="Eraser (Click to toggle eraser or change type)"
            >
              <Eraser className="w-4 h-4 text-white" />
              <span className="text-[12px]">
                {settings.eraserType === 'precision' ? 'Select Area' : 'Eraser'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Eraser Popover Menu */}
            {activeMenu === 'eraserPopover' && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl z-50 w-56 animate-in fade-in zoom-in-95">
                <div className="text-xs font-bold mb-2 pb-1 border-b border-slate-800 text-purple-300">
                  Eraser Type
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      onUpdateSettings({ activeTool: 'eraser', eraserType: 'stroke' });
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
                      settings.eraserType === 'stroke' ? 'bg-purple-700 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Stroke Eraser</span>
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSettings({ activeTool: 'eraser', eraserType: 'precision' });
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
                      settings.eraserType === 'precision' ? 'bg-purple-700 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <BoxSelect className="w-3.5 h-3.5" />
                    <span>Select Area Eraser</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pen Slots 1, 2, 3 Container */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 p-1 rounded-2xl shadow-inner">
            {penSlots.map((slot, index) => {
              const isSlotActive = settings.activeTool === 'pen' && activePenSlotIndex === index;
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => handleSelectPenSlot(index)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                      isSlotActive
                        ? 'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-950 border-white shadow-[0_2px_8px_rgba(255,255,255,0.25)]'
                        : 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 border-slate-700/80'
                    }`}
                    title={`${slot.label} (${slot.color}, ${slot.width}px)`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Pen className="w-3.5 h-3.5" style={{ color: isSlotActive ? '#000000' : slot.color }} />
                      <div
                        className="absolute -bottom-0.5 right-0 w-2 h-2 rounded-full border border-black/40"
                        style={{ backgroundColor: slot.color }}
                      />
                    </div>
                    <span className="text-[11px]">{slot.label}</span>
                    <ChevronDown className={`w-3 h-3 ${isSlotActive ? 'text-slate-800' : 'text-slate-400'}`} />
                  </button>

                  {/* Pen Popover Menu */}
                  {isSlotActive && activeMenu === 'penPopover' && (
                    <PenCustomizerPopover
                      slot={slot}
                      onUpdateSlot={updateActivePenSlot}
                      onClose={() => setActiveMenu(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Highlighter Button */}
          <div className="relative">
            <button
              onClick={() => {
                onUpdateSettings({ activeTool: 'highlighter' });
                setActiveMenu(activeMenu === 'highlighterPopover' ? null : 'highlighterPopover');
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border active:scale-95 ${
                settings.activeTool === 'highlighter'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
              }`}
              title="Highlighter"
            >
              <Highlighter className="w-4 h-4 text-amber-400" />
              <span className="text-[12px]">Highlighter</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                style={{ backgroundColor: settings.highlighterColor }}
              />
            </button>

            {/* Highlighter Popover */}
            {activeMenu === 'highlighterPopover' && (
              <HighlighterCustomizerPopover
                color={settings.highlighterColor}
                width={settings.highlighterWidth}
                onUpdate={onUpdateSettings}
                onClose={() => setActiveMenu(null)}
              />
            )}
          </div>
        </div>

        {/* Right side: Button to Show Upper Panel or Show Both Panels */}
        <div className="flex items-center space-x-1.5 ml-2 shrink-0">
          {onToggleUpperPanel && (
            <button
              onClick={onToggleUpperPanel}
              className="flex items-center space-x-1 px-3 py-1 bg-purple-900/90 hover:bg-purple-800 text-purple-100 border border-purple-500/80 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              title="Show Upper Panel / Expand Header (Ctrl+Shift+U)"
            >
              <ChevronDown className="w-4 h-4 text-purple-300" />
              <span className="hidden sm:inline">Show Upper Panel</span>
            </button>
          )}

          {onShowBothPanels && (
            <button
              onClick={onShowBothPanels}
              className="flex items-center space-x-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95"
              title="Restore both side panel and upper panel simultaneously"
            >
              <PanelTopOpen className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">Show Both Panels</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-50 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-b border-slate-300 dark:border-slate-800 shadow-md flex flex-col select-none overflow-visible">
      {/* Top Ribbon Tabs (Reduced height) */}
      <div className="flex items-center justify-between px-3 py-0.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-200/40 dark:bg-slate-950/60 text-[11px] font-bold text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActiveRibbonTab('draw')}
            className={`pb-0.5 relative transition-colors ${
              activeRibbonTab === 'draw'
                ? 'text-purple-700 dark:text-purple-400 font-extrabold'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Draw</span>
            {activeRibbonTab === 'draw' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveRibbonTab('view')}
            className={`pb-0.5 relative transition-colors ${
              activeRibbonTab === 'view'
                ? 'text-purple-700 dark:text-purple-400 font-extrabold'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>View</span>
            {activeRibbonTab === 'view' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full" />
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleUpperPanel && (
            <button
              onClick={onToggleUpperPanel}
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold text-slate-500 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Hide Upper Panel (Ctrl+Shift+U)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hide Header</span>
            </button>
          )}

          {onHideBothPanels && (
            <button
              onClick={onHideBothPanels}
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/50 transition-colors"
              title="Remove both side panel and upper panel simultaneously (Ctrl+Shift+H)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Hide Both Panels</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Toolbar Ribbon */}
      <div className="px-2.5 py-1 flex flex-wrap items-center justify-between gap-1.5 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 overflow-visible">
        {/* Left: Pen & Tools Section */}
        <div className="flex flex-wrap items-center gap-1.5 py-0.5 overflow-visible">
          {/* Undo / Redo Buttons */}
          <div className="flex items-center space-x-0.5 bg-slate-200/80 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner mr-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1 px-1.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-700 dark:text-slate-200 transition-all active:scale-95 flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-[11px] font-bold hidden xl:inline">Undo</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1 px-1.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-700 dark:text-slate-200 transition-all active:scale-95 flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-[11px] font-bold hidden xl:inline">Redo</span>
            </button>
          </div>

          {/* Eraser Button with Dropdown Arrow */}
          <div className="relative">
            <button
              id="btn-tool-eraser"
              onClick={() => {
                onUpdateSettings({ activeTool: 'eraser' });
                setActiveMenu(activeMenu === 'eraserPopover' ? null : 'eraserPopover');
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                settings.activeTool === 'eraser'
                  ? 'bg-gradient-to-b from-purple-600 to-purple-700 text-white border-purple-400 shadow-[0_3px_6px_rgba(147,51,234,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
                  : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-white dark:hover:bg-slate-700'
              }`}
              title="Eraser (Click dropdown to select Normal or Select Area mode)"
            >
              <Eraser className={`w-3.5 h-3.5 ${settings.activeTool === 'eraser' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
              <span className="hidden sm:inline text-[11px]">
                {settings.eraserType === 'precision' ? 'Select Area' : 'Eraser'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Eraser Popover Menu */}
            {activeMenu === 'eraserPopover' && (
              <div className="absolute top-full left-0 mt-2 p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-72 z-[100] animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                    <Eraser className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Eraser Mode & Size</span>
                  </div>
                  <button
                    onClick={() => setActiveMenu(null)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2 Eraser Modes */}
                <div className="space-y-2 mb-3">
                  <button
                    onClick={() => {
                      onUpdateSettings({ activeTool: 'eraser', eraserType: 'stroke' });
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center space-x-3 text-left transition-all ${
                      (settings.eraserType || 'stroke') === 'stroke'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500/80 text-purple-900 dark:text-purple-200 shadow-xs ring-1 ring-purple-400/50'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      (settings.eraserType || 'stroke') === 'stroke'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Eraser className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>Normal Eraser</span>
                        {(settings.eraserType || 'stroke') === 'stroke' && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Erases whole stroke on touch</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onUpdateSettings({ activeTool: 'eraser', eraserType: 'precision' });
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center space-x-3 text-left transition-all ${
                      settings.eraserType === 'precision'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500/80 text-purple-900 dark:text-purple-200 shadow-xs ring-1 ring-purple-400/50'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      settings.eraserType === 'precision'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <BoxSelect className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>Select Area Eraser</span>
                        {settings.eraserType === 'precision' && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Erases exact area / segment touched</p>
                    </div>
                  </button>
                </div>

                {/* Eraser Size Slider */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    <span>Eraser Size</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{settings.eraserWidth || 20}px</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-1 mb-2">
                    {[10, 20, 32, 50].map((size) => (
                      <button
                        key={size}
                        onClick={() => onUpdateSettings({ eraserWidth: size })}
                        className={`flex-1 py-1 rounded-lg border text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                          (settings.eraserWidth || 20) === size
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" style={{ transform: `scale(${size / 20})` }} />
                        <span>{size}px</span>
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={settings.eraserWidth || 20}
                    onChange={(e) => onUpdateSettings({ eraserWidth: Number(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3 ONE NOTE PEN SLOTS with Color & Thickness Dropdown */}
          <div className="flex items-center space-x-1 bg-slate-200/80 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner">
            {penSlots.map((slot, index) => {
              const isSlotActive = settings.activeTool === 'pen' && activePenSlotIndex === index;
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => handleSelectPenSlot(index)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                      isSlotActive
                        ? 'bg-gradient-to-b from-purple-600 to-purple-700 text-white border-purple-400 shadow-[0_3px_6px_rgba(147,51,234,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
                        : 'bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-850 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-purple-400/60 shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]'
                    }`}
                    title={`${slot.label} (${slot.color}, ${slot.width}px) - Click arrow to customize`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Pen className="w-3.5 h-3.5" style={{ color: isSlotActive ? '#FFFFFF' : slot.color }} />
                      <div
                        className="absolute -bottom-0.5 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 shadow-xs"
                        style={{ backgroundColor: slot.color }}
                      />
                    </div>
                    <span className="hidden sm:inline text-[11px] font-semibold">{slot.label}</span>
                    <ChevronDown className={`w-3 h-3 ${isSlotActive ? 'text-purple-200' : 'text-slate-400'}`} />
                  </button>

                  {/* Pen Color & Thickness Popover Menu */}
                  {isSlotActive && activeMenu === 'penPopover' && (
                    <PenCustomizerPopover
                      slot={slot}
                      onUpdateSlot={updateActivePenSlot}
                      onClose={() => setActiveMenu(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Highlighter Tool with Rich Multi-Color Selection */}
          <div className="relative">
            <button
              id="btn-tool-highlighter"
              onClick={() => {
                onUpdateSettings({ activeTool: 'highlighter' });
                setActiveMenu(activeMenu === 'highlighterPopover' ? null : 'highlighterPopover');
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                settings.activeTool === 'highlighter'
                  ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 border-amber-300 shadow-[0_3px_6px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]'
                  : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-white dark:hover:bg-slate-700'
              }`}
              title="Highlighter (Click arrow for multi-color palette & width settings)"
            >
              <Highlighter className={`w-3.5 h-3.5 ${settings.activeTool === 'highlighter' ? 'text-slate-950' : 'text-amber-500'}`} />
              <span className="hidden sm:inline text-[11px]">Highlighter</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-xs"
                style={{ backgroundColor: settings.highlighterColor }}
              />
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Highlighter Multi-Color Customizer Popover */}
            {activeMenu === 'highlighterPopover' && (
              <HighlighterCustomizerPopover
                color={settings.highlighterColor}
                width={settings.highlighterWidth}
                onUpdate={onUpdateSettings}
                onClose={() => setActiveMenu(null)}
              />
            )}
          </div>

          {/* Expand / Collapse Additional Tools */}
          {!showAllTools ? (
            <button
              onClick={() => setShowAllTools(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 transition-all active:translate-y-[1px]"
              title="Expand Shapes, Text, Image, Pan tools"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline text-[11px]">More Tools</span>
            </button>
          ) : (
            <>
              {/* Shape Tool */}
              <div className="relative">
                <button
                  id="btn-tool-shapes"
                  onClick={() => {
                    onUpdateSettings({ activeTool: 'shape' });
                    setActiveMenu(activeMenu === 'shape' ? null : 'shape');
                  }}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                    settings.activeTool === 'shape'
                      ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-blue-400 shadow-[0_3px_6px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
                      : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]'
                  }`}
                  title="Shapes (Key: S)"
                >
                  <Shapes className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Shapes</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {/* Shape Selection Popover Menu */}
                {activeMenu === 'shape' && (
                  <div className="absolute top-full left-0 mt-2 p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-68 z-[100] animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Select Shape</span>
                      <button
                        onClick={() => setActiveMenu(null)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[
                        { type: 'line', label: 'Line', icon: Minus },
                        { type: 'arrow', label: 'Arrow', icon: ArrowRight },
                        { type: 'rectangle', label: 'Rect', icon: Square },
                        { type: 'circle', label: 'Circle', icon: Circle },
                        { type: 'triangle', label: 'Triangle', icon: Shapes },
                        { type: 'star', label: 'Star', icon: Sparkles },
                        { type: 'axis', label: 'Axis', icon: Maximize2 },
                        { type: 'table', label: 'Table', icon: TableIcon },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            onClick={() => {
                              if (item.type === 'table') {
                                setShowTableModal(true);
                                setActiveMenu(null);
                              } else {
                                onUpdateSettings({ shapeType: item.type as ShapeType, activeTool: 'shape' });
                                setActiveMenu(null);
                              }
                            }}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 ${
                              settings.shapeType === item.type
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <Icon className="w-4 h-4 mb-1" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Fill Color Bucket Tool */}
              <div className="relative">
                <button
                  id="btn-tool-fill"
                  onClick={() => {
                    onUpdateSettings({ activeTool: 'fill' });
                    setActiveMenu(activeMenu === 'fill' ? null : 'fill');
                  }}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                    settings.activeTool === 'fill'
                      ? 'bg-gradient-to-b from-amber-600 to-amber-700 text-white border-amber-400 shadow-[0_3px_6px_rgba(217,119,6,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
                      : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]'
                  }`}
                  title="Fill Color"
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Fill</span>
                </button>

                {/* Fill Bucket Menu */}
                {activeMenu === 'fill' && (
                  <div className="absolute top-full left-0 mt-2 p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-60 z-[100] animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Fill Color Bucket</span>
                      <button
                        onClick={() => setActiveMenu(null)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-2 mb-2">
                      {FILL_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            onUpdateSettings({ shapeFillColor: c, activeTool: 'fill' });
                            setActiveMenu(null);
                          }}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                            settings.shapeFillColor === c
                              ? 'border-amber-600 scale-110 shadow-md ring-2 ring-amber-400'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                          style={{ backgroundColor: c === 'transparent' ? '#FFFFFF' : c }}
                          title={c === 'transparent' ? 'No Fill' : c}
                        >
                          {c === 'transparent' && <span className="text-[10px] font-bold text-red-500">/</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Tool */}
              <button
                id="btn-tool-text"
                onClick={() => onUpdateSettings({ activeTool: 'text' })}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                  settings.activeTool === 'text'
                    ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-emerald-400 shadow-[0_3px_6px_rgba(5,150,105,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
                    : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]'
                }`}
                title="Text Box (Key: T)"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[11px]">Text</span>
              </button>

              {/* Image Tool */}
              <label
                id="btn-tool-image"
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] cursor-pointer transition-all active:translate-y-[1px]"
                title="Insert Image"
              >
                <Image className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline text-[11px]">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onInsertImage) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        if (evt.target?.result) {
                          onInsertImage(evt.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>

              {/* Pan / Hand Tool */}
              <button
                id="btn-tool-pan"
                onClick={() => onUpdateSettings({ activeTool: 'pan' })}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:translate-y-[1px] ${
                  settings.activeTool === 'pan'
                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 text-white border-slate-600 shadow-[0_3px_6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]'
                    : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]'
                }`}
                title="Hand / Pan Page"
              >
                <Hand className="w-3.5 h-3.5" />
                <span className="text-[11px]">Pan</span>
              </button>

              <button
                onClick={() => setShowAllTools(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1"
                title="Hide extra tools"
              >
                Compact
              </button>
            </>
          )}
        </div>

        {/* Right: Paper Style, Palm Guard, Clear Annotations */}
        <div className="flex items-center space-x-1.5">
          {/* Paper Pattern Template */}
          <div className="relative">
            <button
              id="btn-paper-template"
              onClick={() => setActiveMenu(activeMenu === 'paper' ? null : 'paper')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1px]"
              title="Paper Pattern Template"
            >
              <Grid className="w-3.5 h-3.5 text-purple-600" />
              <span className="capitalize text-[11px]">{settings.paperTemplate}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {activeMenu === 'paper' && (
              <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-56 z-[100]">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Paper Background
                </div>
                {(['blank', 'ruled', 'grid', 'dotted', 'music'] as PaperTemplate[]).map(
                  (template) => (
                    <button
                      key={template}
                      onClick={() => {
                        onUpdateSettings({ paperTemplate: template });
                        setActiveMenu(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize flex items-center justify-between ${
                        settings.paperTemplate === template
                          ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{template}</span>
                      {settings.paperTemplate === template && <Check className="w-3.5 h-3.5" />}
                    </button>
                  )
                )}

                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5 px-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      <span>Line Darkness</span>
                      <span className="font-mono text-purple-600">{settings.lineDarkness ?? 40}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={settings.lineDarkness ?? 40}
                      onChange={(e) => onUpdateSettings({ lineDarkness: Number(e.target.value) })}
                      className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Palm Rejection Toggle */}
          <button
            onClick={() => onUpdateSettings({ palmRejection: !settings.palmRejection })}
            className={`hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:translate-y-[1px] ${
              settings.palmRejection
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title="Palm Guard"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Palm Guard {settings.palmRejection ? 'ON' : 'OFF'}</span>
          </button>

          {/* Clear Annotations */}
          <button
            onClick={onClearPageAnnotations}
            className="p-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 transition-colors"
            title="Clear Annotations on Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Dimensions Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl text-white">
            <div className="flex items-center space-x-2 mb-4 text-purple-400 font-bold text-base">
              <TableIcon className="w-5 h-5" />
              <span>Insert Table</span>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Rows</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-hidden focus:border-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Columns</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-hidden focus:border-purple-500 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onInsertTable) onInsertTable(tableRows, tableCols);
                  setShowTableModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


