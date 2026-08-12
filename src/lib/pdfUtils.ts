import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import { PageData, Annotation, PaperTemplate } from '../types';
import { drawPaperBackground, drawStroke, drawShape, drawText } from './drawingUtils';
import { getPdfMeta, getPdfRange } from './db';

// Configure pdfjs worker to local bundled script for 100% offline support
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  pageNumber: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

// LRU Cache for rendered PDF page canvases
interface CachedCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}
const renderedPageCache = new Map<string, CachedCanvas>();
// A 2x A4 canvas can consume tens of MB of decoded memory. Keeping 60
// canvases makes large PDFs themselves the source of lag/OOM. A small LRU
// cache keeps adjacent-page scrolling instant without pinning hundreds of MB.
const MAX_CACHE_PAGES = 12;

// PDF.js asks for small ranges; keeping requests around 1 MiB gives fast
// random access while avoiding multi-megabyte copies for every page.
const PDF_RANGE_CHUNK_SIZE = 1024 * 1024;
const PDF_SCREEN_RENDER_SCALE = 1.35;

type RangeReader = (begin: number, end: number) => Promise<Uint8Array>;

class IndexedDbPdfRangeTransport extends pdfjsLib.PDFDataRangeTransport {
  private reader: RangeReader;

  constructor(length: number, reader: RangeReader) {
    super(length, new Uint8Array(0), false);
    this.reader = reader;
  }

  requestDataRange(begin: number, end: number) {
    void this.reader(begin, end)
      .then((chunk) => this.onDataRange(begin, chunk))
      .catch((error) => console.error('[PDF] IndexedDB range request failed:', error));
  }
}

class FilePdfRangeTransport extends pdfjsLib.PDFDataRangeTransport {
  private file: Blob;

  constructor(file: Blob) {
    super(file.size, new Uint8Array(0), false);
    this.file = file;
  }

  requestDataRange(begin: number, end: number) {
    void this.file
      .slice(begin, end)
      .arrayBuffer()
      .then((buffer) => this.onDataRange(begin, new Uint8Array(buffer)))
      .catch((error) => {
        console.error('[PDF] Range request failed:', error);
      });
  }
}

/**
 * Open a large PDF directly from a File/Blob using PDF.js range requests.
 * The browser never needs a second full-size ArrayBuffer.
 */
export async function loadPdfDocumentFromFile(
  pdfId: string,
  file: Blob
): Promise<pdfjsLib.PDFDocumentProxy> {
  const cached = pdfDocCache.get(pdfId);
  if (cached) return cached;

  const transport = new FilePdfRangeTransport(file);
  const loadingTask = pdfjsLib.getDocument({
    range: transport,
    rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
    disableAutoFetch: true,
    disableStream: true,
  });
  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(pdfId, pdfDoc);
  return pdfDoc;
}

/**
 * Open a PDF stored in IndexedDB without rebuilding the entire file in RAM.
 * PDF.js asks for only the byte ranges needed for parsing/rendering.
 */
export async function loadPdfDocumentFromStore(
  pdfId: string
): Promise<pdfjsLib.PDFDocumentProxy> {
  const cached = pdfDocCache.get(pdfId);
  if (cached) return cached;

  const meta = await getPdfMeta(pdfId);
  if (!meta) throw new Error(`PDF metadata not found: ${pdfId}`);

  const transport = new IndexedDbPdfRangeTransport(meta.size, (begin, end) =>
    getPdfRange(pdfId, begin, end)
  );

  const loadingTask = pdfjsLib.getDocument({
    range: transport,
    rangeChunkSize: Math.min(PDF_RANGE_CHUNK_SIZE, meta.chunkSize),
    disableAutoFetch: true,
    disableStream: true,
  });
  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(pdfId, pdfDoc);
  return pdfDoc;
}

export async function clearPdfDocumentCache(pdfId?: string) {
  if (pdfId) {
    const doc = pdfDocCache.get(pdfId);
    if (doc) {
      try { await doc.cleanup(); } catch {}
    }
    pdfDocCache.delete(pdfId);
    for (const key of renderedPageCache.keys()) {
      if (key.startsWith(`${pdfId}_`)) {
        const cached = renderedPageCache.get(key);
        if (cached?.canvas) { cached.canvas.width = 1; cached.canvas.height = 1; }
        renderedPageCache.delete(key);
      }
    }
    return;
  }

  for (const doc of pdfDocCache.values()) {
    try { await doc.cleanup(); } catch {}
  }
  pdfDocCache.clear();
  for (const cached of renderedPageCache.values()) {
    if (cached.canvas) { cached.canvas.width = 1; cached.canvas.height = 1; }
  }
  renderedPageCache.clear();
}


export async function loadPdfDocument(
  pdfId: string,
  arrayBuffer: ArrayBuffer
): Promise<pdfjsLib.PDFDocumentProxy> {
  if (pdfDocCache.has(pdfId)) {
    return pdfDocCache.get(pdfId)!;
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(pdfId, pdfDoc);
  return pdfDoc;
}

/**
 * Render a single page of PDF to an HTML Canvas (with LRU Cache)
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  desiredScale: number = PDF_SCREEN_RENDER_SCALE
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  // Check LRU cache
  const cacheKey = `${(pdfDoc as any)._fingerprint || 'pdf'}_${pageNumber}_${desiredScale}`;
  if (renderedPageCache.has(cacheKey)) {
    const cached = renderedPageCache.get(cacheKey)!;
    // Refresh LRU order
    renderedPageCache.delete(cacheKey);
    renderedPageCache.set(cacheKey, cached);
    return cached;
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: desiredScale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  await page.render(renderContext as any).promise;

  const result = {
    canvas,
    width: viewport.width / desiredScale,
    height: viewport.height / desiredScale,
  };

  // Save to LRU Cache
  if (renderedPageCache.size >= MAX_CACHE_PAGES) {
    const firstKey = renderedPageCache.keys().next().value;
    if (firstKey) {
      const evicted = renderedPageCache.get(firstKey);
      // Explicitly shrink the backing store before dropping the reference.
      // This matters on Chromium when rapidly jumping through 3000+ pages.
      if (evicted?.canvas) {
        evicted.canvas.width = 1;
        evicted.canvas.height = 1;
      }
      renderedPageCache.delete(firstKey);
    }
  }
  renderedPageCache.set(cacheKey, result);

  return result;
}

/** Warm one or more nearby pages during idle time. This keeps scrolling through
 * a huge PDF responsive without rendering thousands of pages up front. */
export function warmPdfPages(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumbers: number[],
  desiredScale: number = PDF_SCREEN_RENDER_SCALE
) {
  const unique = [...new Set(pageNumbers)].filter((n) => n >= 1 && n <= pdfDoc.numPages);
  const run = () => {
    for (const pageNumber of unique) {
      void renderPdfPageToCanvas(pdfDoc, pageNumber, desiredScale).catch(() => undefined);
    }
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 120 });
  } else {
    setTimeout(run, 40);
  }
}

/**
 * Render a complete PageData (Paper template or PDF + Annotations) onto a clean export canvas
 */
export async function renderPageDataToCanvas(
  pageData: PageData,
  getPdfBufferFn?: (pdfId: string) => Promise<ArrayBuffer | null>,
  scale: number = 2.0,
  getPdfDocumentFn?: (pdfId: string) => Promise<pdfjsLib.PDFDocumentProxy>
): Promise<HTMLCanvasElement> {
  const exportCanvas = document.createElement('canvas');
  const width = pageData.width || 850;
  const height = pageData.height || 1100;

  exportCanvas.width = width * scale;
  exportCanvas.height = height * scale;

  const ctx = exportCanvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // 1. Render Background (PDF page or Paper template)
  if (pageData.pdfId && pageData.pdfPageNumber && (getPdfBufferFn || getPdfDocumentFn)) {
    try {
      const pdfDoc = getPdfDocumentFn
        ? await getPdfDocumentFn(pageData.pdfId)
        : (getPdfBufferFn
            ? await getPdfBufferFn(pageData.pdfId).then((buffer) =>
                buffer ? loadPdfDocument(pageData.pdfId!, buffer) : null
              )
            : null);
      if (pdfDoc) {
        const pdfPage = await pdfDoc.getPage(pageData.pdfPageNumber);
        
        // Calculate viewport to match page target dimensions
        const unscaledViewport = pdfPage.getViewport({ scale: 1.0 });
        const pdfScale = width / unscaledViewport.width;
        const viewport = pdfPage.getViewport({ scale: pdfScale });

        // Temporary canvas for pdf rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width * scale;
        tempCanvas.height = height * scale;
        const tempCtx = tempCanvas.getContext('2d')!;

        const renderContext = {
          canvasContext: tempCtx,
          viewport: pdfPage.getViewport({ scale: pdfScale * scale }),
          canvas: tempCanvas,
        };

        await pdfPage.render(renderContext as any).promise;
        ctx.drawImage(tempCanvas, 0, 0, width, height);
      } else {
        drawPaperBackground(ctx, width, height, pageData.paperTemplate || 'blank');
      }
    } catch (err) {
      console.error('Error rendering PDF background:', err);
      drawPaperBackground(ctx, width, height, pageData.paperTemplate || 'blank');
    }
  } else {
    drawPaperBackground(ctx, width, height, pageData.paperTemplate || 'blank');
  }

  // 2. Render Annotations (Strokes, Shapes, Text)
  for (const anno of pageData.annotations) {
    if (anno.type === 'stroke') {
      drawStroke(ctx, anno);
    } else if (anno.type === 'shape') {
      drawShape(ctx, anno);
    } else if (anno.type === 'text') {
      drawText(ctx, anno);
    }
  }

  return exportCanvas;
}

/**
 * Generate multi-page PDF document containing all annotated pages
 */
export async function generateAnnotatedPdf(
  pages: PageData[],
  title: string,
  getPdfBufferFn?: (pdfId: string) => Promise<ArrayBuffer | null>,
  onProgress?: (progress: number, total: number) => void,
  getPdfDocumentFn?: (pdfId: string) => Promise<pdfjsLib.PDFDocumentProxy>
): Promise<Blob> {
  let pdfDoc: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    const pageData = pages[i];
    if (onProgress) onProgress(i + 1, pages.length);

    const canvas = await renderPageDataToCanvas(pageData, getPdfBufferFn, 2.0, getPdfDocumentFn);
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    // Release the large raster surface as soon as it has been encoded.
    canvas.width = 1;
    canvas.height = 1;

    const widthPt = (pageData.width || 850) * 0.75; // Convert px to pt (~72 dpi vs 96 dpi)
    const heightPt = (pageData.height || 1100) * 0.75;

    if (i === 0) {
      pdfDoc = new jsPDF({
        orientation: widthPt > heightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [widthPt, heightPt],
      });
      pdfDoc.addImage(imgData, 'JPEG', 0, 0, widthPt, heightPt);
    } else if (pdfDoc) {
      pdfDoc.addPage([widthPt, heightPt], widthPt > heightPt ? 'landscape' : 'portrait');
      pdfDoc.addImage(imgData, 'JPEG', 0, 0, widthPt, heightPt);
    }
  }

  if (!pdfDoc) {
    pdfDoc = new jsPDF();
    pdfDoc.text('Empty Document', 20, 20);
  }

  return pdfDoc.output('blob');
}
