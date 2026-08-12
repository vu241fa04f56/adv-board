import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { NotebookData, SectionData, PageData, ToolSettings } from '../types';

interface OneNoteDB extends DBSchema {
  notebooks: {
    key: string;
    value: NotebookData;
  };
  sections: {
    key: string;
    value: SectionData;
    indexes: { 'by-notebook': string };
  };
  pages: {
    key: string;
    value: PageData;
    indexes: { 'by-section': string };
  };
  pdfBuffers: {
    key: string;
    value: {
      id: string;
      filename: string;
      data: ArrayBuffer;
      pageCount: number;
      createdAt: number;
    };
  };
  pdfMeta: {
    key: string;
    value: {
      id: string;
      filename: string;
      size: number;
      pageCount: number;
      chunkSize: number;
      chunkCount: number;
      createdAt: number;
      updatedAt: number;
      source?: 'local' | 'drive';
      driveFileId?: string;
    };
  };
  pdfChunks: {
    key: string;
    value: {
      id: string;
      pdfId: string;
      index: number;
      data: Blob;
    };
    indexes: { 'by-pdf': string };
  };
  settings: {
    key: string;
    value: {
      id: string;
      data: any;
    };
  };
}

const DB_NAME = 'onenote_pdf_studio_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<OneNoteDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<OneNoteDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OneNoteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notebooks')) {
          db.createObjectStore('notebooks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sections')) {
          const sectionStore = db.createObjectStore('sections', { keyPath: 'id' });
          sectionStore.createIndex('by-notebook', 'notebookId');
        }
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('by-section', 'sectionId');
        }
        if (!db.objectStoreNames.contains('pdfBuffers')) {
          db.createObjectStore('pdfBuffers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pdfMeta')) {
          db.createObjectStore('pdfMeta', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pdfChunks')) {
          const chunkStore = db.createObjectStore('pdfChunks', { keyPath: 'id' });
          chunkStore.createIndex('by-pdf', 'pdfId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// Default initial seed data if DB is completely empty
export async function seedInitialDataIfNeeded(): Promise<{
  notebooks: NotebookData[];
  sections: SectionData[];
}> {
  const db = await getDB();
  const existingNotebooks = await db.getAll('notebooks');
  
  if (existingNotebooks.length > 0) {
    const sections = await db.getAll('sections');
    return { notebooks: existingNotebooks, sections };
  }

  // Create default welcome notebook
  const defaultNotebook: NotebookData = {
    id: 'nb_welcome',
    title: 'My Notebook',
    color: '#7C3AED', // OneNote Purple
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultSection1: SectionData = {
    id: 'sec_quick_notes',
    notebookId: 'nb_welcome',
    title: 'Quick Notes & Annotations',
    color: '#8B5CF6',
    order: 0,
    pages: [
      {
        id: 'pg_welcome_1',
        title: 'Welcome to OneNote PDF Studio',
        order: 0,
        paperTemplate: 'grid',
        annotations: [
          {
            id: 'anno_1',
            type: 'text',
            x: 60,
            y: 80,
            text: 'Welcome to OneNote PDF Studio! 📝',
            color: '#6D28D9',
            fontSize: 28,
            fontFamily: 'sans-serif',
          },
          {
            id: 'anno_2',
            type: 'text',
            x: 60,
            y: 130,
            text: '• Import PDFs of ANY size and annotate with freehand stylus or pen',
            color: '#374151',
            fontSize: 18,
            fontFamily: 'sans-serif',
          },
          {
            id: 'anno_3',
            type: 'text',
            x: 60,
            y: 165,
            text: '• Use Highlighter, Eraser, Shapes, Text tools & Custom Papers (Grid, Ruled, Dotted)',
            color: '#374151',
            fontSize: 18,
            fontFamily: 'sans-serif',
          },
          {
            id: 'anno_4',
            type: 'text',
            x: 60,
            y: 200,
            text: '• Insert blank notebook pages BETWEEN existing PDF pages anytime',
            color: '#374151',
            fontSize: 18,
            fontFamily: 'sans-serif',
          },
          {
            id: 'anno_5',
            type: 'text',
            x: 60,
            y: 235,
            text: '• Export fully annotated documents as vector PDF or backup JSON',
            color: '#374151',
            fontSize: 18,
            fontFamily: 'sans-serif',
          },
          {
            id: 'anno_highlight_demo',
            type: 'stroke',
            tool: 'highlighter',
            color: '#FDE047',
            width: 24,
            opacity: 0.5,
            points: [
              { x: 55, y: 92 },
              { x: 530, y: 92 },
            ],
            isStraightLine: true,
          },
          {
            id: 'anno_pen_demo',
            type: 'stroke',
            tool: 'pen',
            color: '#2563EB',
            width: 3,
            opacity: 1,
            points: [
              { x: 60, y: 290 },
              { x: 120, y: 320 },
              { x: 180, y: 280 },
              { x: 240, y: 310 },
              { x: 300, y: 290 },
            ],
          },
          {
            id: 'anno_shape_demo',
            type: 'shape',
            shapeType: 'arrow',
            color: '#10B981',
            width: 3,
            opacity: 1,
            startPoint: { x: 350, y: 300 },
            endPoint: { x: 520, y: 300 },
          },
          {
            id: 'anno_text_demo',
            type: 'text',
            x: 540,
            y: 290,
            text: 'Try drawing here!',
            color: '#059669',
            fontSize: 16,
            fontFamily: 'sans-serif',
          }
        ],
        width: 850,
        height: 1100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'pg_welcome_2',
        title: 'Ruled Paper Practice Page',
        order: 1,
        paperTemplate: 'ruled',
        annotations: [],
        width: 850,
        height: 1100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ],
  };

  const tx = db.transaction(['notebooks', 'sections'], 'readwrite');
  await tx.objectStore('notebooks').put(defaultNotebook);
  await tx.objectStore('sections').put(defaultSection1);
  await tx.done;

  return {
    notebooks: [defaultNotebook],
    sections: [defaultSection1],
  };
}

// Large-PDF storage
// 8 MiB chunks keep individual IndexedDB records manageable while avoiding
// the multi-hundred-MB ArrayBuffer copies used by the old implementation.
export const PDF_CHUNK_SIZE = 16 * 1024 * 1024; // 16 MiB local storage blocks: fewer IDB transactions, still range-friendly

export interface StoredPdfMeta {
  id: string;
  filename: string;
  size: number;
  pageCount: number;
  chunkSize: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
  source?: 'local' | 'drive';
  driveFileId?: string;
}

export async function createPdfStore(
  id: string,
  filename: string,
  size: number,
  pageCount: number,
  options: { source?: 'local' | 'drive'; driveFileId?: string } = {}
): Promise<StoredPdfMeta> {
  const db = await getDB();
  const now = Date.now();
  const old = await db.get('pdfMeta', id);
  const chunkCount = Math.ceil(size / PDF_CHUNK_SIZE);
  const meta: StoredPdfMeta = {
    id,
    filename,
    size,
    pageCount,
    chunkSize: PDF_CHUNK_SIZE,
    chunkCount,
    createdAt: old?.createdAt || now,
    updatedAt: now,
    source: options.source,
    driveFileId: options.driveFileId,
  };
  await db.put('pdfMeta', meta);
  return meta;
}

export async function savePdfChunk(id: string, index: number, data: Blob): Promise<void> {
  const db = await getDB();
  await db.put('pdfChunks', { id: `${id}:${index}`, pdfId: id, index, data });
}

export async function savePdfFile(
  id: string,
  filename: string,
  file: Blob,
  pageCount: number,
  options: { source?: 'local' | 'drive'; driveFileId?: string; onProgress?: (done: number, total: number) => void } = {}
): Promise<StoredPdfMeta> {
  const db = await getDB();
  const old = await db.get('pdfMeta', id);
  const total = file.size;
  const chunkCount = Math.ceil(total / PDF_CHUNK_SIZE);
  const now = Date.now();

  // Remove old chunks first when replacing an existing PDF.
  const oldChunks = await db.getAllFromIndex('pdfChunks', 'by-pdf', id);
  const tx = db.transaction(['pdfMeta', 'pdfChunks'], 'readwrite');
  for (const chunk of oldChunks) {
    tx.objectStore('pdfChunks').delete(chunk.id);
  }

  const meta: StoredPdfMeta = {
    id,
    filename,
    size: total,
    pageCount,
    chunkSize: PDF_CHUNK_SIZE,
    chunkCount,
    createdAt: old?.createdAt || now,
    updatedAt: now,
    source: options.source,
    driveFileId: options.driveFileId,
  };
  tx.objectStore('pdfMeta').put(meta);
  await tx.done;

  // Write a handful of chunks per transaction. Sequential one-record
  // transactions are surprisingly slow for 500 MB+ imports; batching keeps
  // the UI responsive while making the initial save much faster.
  const BATCH_SIZE = 6;
  for (let batchStart = 0; batchStart < chunkCount; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(chunkCount, batchStart + BATCH_SIZE);
    const txChunks = db.transaction('pdfChunks', 'readwrite');

    for (let index = batchStart; index < batchEnd; index++) {
      const start = index * PDF_CHUNK_SIZE;
      const end = Math.min(total, start + PDF_CHUNK_SIZE);
      txChunks.store.put({
        id: `${id}:${index}`,
        pdfId: id,
        index,
        data: file.slice(start, end),
      });
    }

    await txChunks.done;
    const done = Math.min(total, batchEnd * PDF_CHUNK_SIZE);
    options.onProgress?.(done, total);
  }

  return meta;
}

// Backward-compatible API for older callers. New large-file paths should use
// savePdfFile() so the original PDF never has to exist as one giant buffer.
export async function savePdfBuffer(
  id: string,
  filename: string,
  data: ArrayBuffer,
  pageCount: number
) {
  return savePdfFile(id, filename, new Blob([data], { type: 'application/pdf' }), pageCount);
}

export async function getPdfMeta(id: string) {
  const db = await getDB();
  return db.get('pdfMeta', id);
}

export async function setPdfDriveFileId(id: string, driveFileId: string): Promise<void> {
  const db = await getDB();
  const meta = await db.get('pdfMeta', id);
  if (!meta) return;
  await db.put('pdfMeta', { ...meta, driveFileId, updatedAt: Date.now() });
}

export async function getPdfChunk(id: string, index: number): Promise<Blob | null> {
  const db = await getDB();
  const item = await db.get('pdfChunks', `${id}:${index}`);
  return item?.data || null;
}

export async function getPdfRange(id: string, begin: number, end: number): Promise<Uint8Array> {
  const meta = await getPdfMeta(id);
  if (!meta) throw new Error(`PDF metadata not found: ${id}`);

  const safeBegin = Math.max(0, begin);
  const safeEnd = Math.min(meta.size, end);
  if (safeEnd <= safeBegin) return new Uint8Array(0);

  const firstChunk = Math.floor(safeBegin / meta.chunkSize);
  const lastChunk = Math.floor((safeEnd - 1) / meta.chunkSize);
  const parts: Uint8Array[] = [];
  let total = 0;

  for (let index = firstChunk; index <= lastChunk; index++) {
    const blob = await getPdfChunk(id, index);
    if (!blob) throw new Error(`Missing PDF chunk ${index} for ${id}`);

    const chunkStart = index * meta.chunkSize;
    const from = Math.max(0, safeBegin - chunkStart);
    const to = Math.min(blob.size, safeEnd - chunkStart);

    // IMPORTANT: do not read the entire 4/8 MiB IndexedDB chunk just because
    // PDF.js requested a small range. Blob.slice() lets the browser read only
    // the bytes needed for this page. This removes a major source of lag when
    // jumping around a 3000+ page document.
    const part = new Uint8Array(await blob.slice(from, to).arrayBuffer());
    parts.push(part);
    total += part.byteLength;
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

export async function getPdfBlob(id: string): Promise<Blob | null> {
  const meta = await getPdfMeta(id);
  if (!meta) return null;
  const parts: Blob[] = [];
  for (let i = 0; i < meta.chunkCount; i++) {
    const chunk = await getPdfChunk(id, i);
    if (!chunk) return null;
    parts.push(chunk);
  }
  return new Blob(parts, { type: 'application/pdf' });
}

// Legacy compatibility. Avoid using this for rendering large PDFs.
export async function getPdfBuffer(id: string) {
  const db = await getDB();
  const legacy = await db.get('pdfBuffers', id);
  if (legacy) return legacy;

  const meta = await getPdfMeta(id);
  if (!meta) return undefined;
  const bytes = await getPdfRange(id, 0, meta.size);
  return {
    id: meta.id,
    filename: meta.filename,
    data: bytes.buffer,
    pageCount: meta.pageCount,
    createdAt: meta.createdAt,
  };
}

export async function deletePdfBuffer(id: string) {
  const db = await getDB();
  await db.delete('pdfBuffers', id);
  await db.delete('pdfMeta', id);
  const chunks = await db.getAllFromIndex('pdfChunks', 'by-pdf', id);
  if (chunks.length) {
    const tx = db.transaction('pdfChunks', 'readwrite');
    for (const chunk of chunks) tx.store.delete(chunk.id);
    await tx.done;
  }
}

// Notebook Operations
export async function saveNotebook(notebook: NotebookData) {
  const db = await getDB();
  await db.put('notebooks', notebook);
}

export async function deleteNotebookFromDB(notebookId: string) {
  const db = await getDB();
  const tx = db.transaction(['notebooks', 'sections'], 'readwrite');
  await tx.objectStore('notebooks').delete(notebookId);
  
  const sections = await tx.objectStore('sections').getAll();
  for (const sec of sections) {
    if (sec.notebookId === notebookId) {
      await tx.objectStore('sections').delete(sec.id);
    }
  }
  await tx.done;
}

// Section Operations
export async function saveSection(section: SectionData) {
  const db = await getDB();
  await db.put('sections', section);
}

export async function deleteSectionFromDB(sectionId: string) {
  const db = await getDB();
  await db.delete('sections', sectionId);
}

// Settings Operations
export async function saveSettings(settings: ToolSettings) {
  const db = await getDB();
  await db.put('settings', { id: 'user_tool_settings', data: settings });
}

export async function loadSettings(): Promise<ToolSettings | null> {
  const db = await getDB();
  const item = await db.get('settings', 'user_tool_settings');
  return item ? item.data : null;
}
