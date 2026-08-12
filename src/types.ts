export type PaperTemplate = 'blank' | 'ruled' | 'grid' | 'dotted' | 'music';

export type ToolType = 
  | 'pen' 
  | 'highlighter' 
  | 'eraser' 
  | 'shape' 
  | 'text' 
  | 'fill'
  | 'lasso' 
  | 'pan';

export type ShapeType = 'line' | 'arrow' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'axis' | 'table';

export type EraserType = 'stroke' | 'precision';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface StrokeAnnotation {
  id: string;
  type: 'stroke';
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  isStraightLine?: boolean;
}

export interface ShapeAnnotation {
  id: string;
  type: 'shape';
  shapeType: ShapeType;
  color: string;
  fillColor?: string;
  width: number;
  opacity: number;
  startPoint: Point;
  endPoint: Point;
  isDashed?: boolean;
  text?: string;
  textColor?: string;
  fontSize?: number;
  rotation?: number;
}

export interface TextAnnotation {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  width?: number;
  rotation?: number;
}

export interface ImageAnnotation {
  id: string;
  type: 'image';
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface TableAnnotation {
  id: string;
  type: 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  rowHeights: number[];
  colWidths: number[];
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  showCellBorders?: boolean;
  cellsData?: { [cellKey: string]: string };
  cellFills?: { [cellKey: string]: string };
  rotation?: number;
}

export type Annotation =
  | StrokeAnnotation
  | ShapeAnnotation
  | TextAnnotation
  | ImageAnnotation
  | TableAnnotation;

export interface PageData {
  id: string;
  title: string;
  order: number;
  paperTemplate: PaperTemplate;
  lineDarkness?: number; // 10 to 100
  paperDarkness?: number; // 0 (light) to 100 (dark)
  pdfPageNumber?: number; // 1-indexed page number if sourced from a PDF
  pdfId?: string; // Reference to PDF ArrayBuffer stored in IndexedDB
  annotations: Annotation[];
  width: number; // e.g. 800 (A4 aspect default or PDF native width)
  height: number; // e.g. 1130
  createdAt: number;
  updatedAt: number;
}

export interface SectionData {
  id: string;
  notebookId: string;
  title: string;
  color: string; // E.g. #7C3AED (purple), #2563EB (blue), etc.
  order: number;
  pages: PageData[];
}

export interface NotebookData {
  id: string;
  title: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  pdfIds?: string[]; // IDs of PDFs associated with this notebook
}

export interface ToolSettings {
  activeTool: ToolType;
  penColor: string;
  penWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  eraserType: EraserType;
  eraserWidth: number;
  shapeType: ShapeType;
  shapeStrokeColor: string;
  shapeFillColor: string;
  shapeWidth: number;
  shapeIsDashed: boolean;
  textColor: string;
  textSize: number;
  paperTemplate: PaperTemplate;
  lineDarkness: number; // 10 to 100 opacity/intensity
  paperDarkness: number; // 0 (white paper) to 100 (dark canvas)
  palmRejection: boolean; // Ignore touch input when pen is active
  snapToStraightLine: boolean; // Auto snap highlighter/pen to straight line
}

export interface QuickPreset {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  label?: string;
}

export type ViewMode = 'single' | 'continuous' | 'grid';
