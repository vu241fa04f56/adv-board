# Large PDF support

This version is designed for large PDFs (500 MB+).

## What changed

- Local PDF import uses PDF.js `PDFDataRangeTransport` against the selected `File`.
  The whole file is no longer copied into an `ArrayBuffer` just to parse page count.
- PDFs are persisted in IndexedDB as 8 MiB Blob chunks.
- PDF.js opens stored PDFs through an IndexedDB-backed range transport, so page
  rendering reads only the byte ranges requested by PDF.js.
- Google Drive imports download PDFs in 8 MiB HTTP Range chunks with retry.
- Google Drive uploads use resumable uploads with 8 MiB chunks and retry failed
  chunks without restarting the complete file.
- Notebook JSON backups no longer embed PDF bytes as base64. They contain
  `pdfRefs` pointing to separate Drive PDF files.
- Existing small v1 base64 notebook backups are still supported for compatibility.
  Very large v1 embedded PDFs are rejected instead of risking a browser OOM.
- Render is configured as a Node web service; the application does not proxy
  500 MB PDFs through the Express server.

## Important limitation

A PDF can be 500 MB while still containing extremely expensive pages (for
example, giant scanned images). The application avoids unnecessary whole-file
memory copies and whole-document rendering, but no browser application can
guarantee zero rendering delay for every PDF/device combination.

The exported annotated PDF is still assembled by jsPDF in browser memory.
The input PDF is range-backed, but the final generated PDF must exist as an
output document before a normal browser download can begin. For extremely
large
*generated* exports, a future server-side streaming PDF writer would be the
next optimization.

## Deployment variables

Set these on Render:

- `NODE_ENV=production`
- `GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_ID` (same client ID; used by the React build)
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL=https://YOUR-RENDER-DOMAIN/api/auth/google/callback`
- `JWT_SECRET`
- `APP_URL=https://YOUR-RENDER-DOMAIN`

Never commit `.env` or OAuth secrets.

## 2026-08-12 performance pass

The viewer is intentionally virtualized. A 3000+ page section keeps page metadata in memory, but only a small window of CanvasWorkspace instances is mounted. Page jumps use direct scroll offsets rather than traversing intermediate pages.

Performance safeguards:
- Large PDFs are opened with PDF.js range transport and 1 MiB range requests.
- IndexedDB range reads use `Blob.slice()` so a 512 KiB request does not decode an entire 8 MiB storage chunk.
- Rendered PDF canvases use a 12-entry LRU instead of retaining dozens of high-resolution canvases.
- The current page and immediate neighbors are warmed during browser idle time.
- The viewer uses `content-visibility`/containment for virtualized page cards.
- CanvasWorkspace is memoized so unchanged neighboring pages do not rerender after every annotation.
- Undo/redo uses synchronous refs, a per-page baseline, and a 100-step cap; rapid clicks do not race React state updates.
- IndexedDB imports batch six PDF chunks per transaction to reduce large-file import overhead.

A literal zero-latency guarantee is impossible for every 3000-page scanned PDF and every device. The architecture avoids the common causes of lag: full-document parsing, rendering all pages, repeated full-chunk reads, and unbounded canvas/history memory.


## 2026 large-transfer optimizations

- Google Drive uploads use a 32 MiB resumable chunk size to reduce HTTP round-trips while respecting Drive's 256 KiB chunk alignment requirement.
- Google Drive imports use 16 MiB HTTP Range blocks with 2-3 concurrent workers, bounded to one block per worker, then write directly to IndexedDB.
- Sync progress reports bytes transferred, bytes remaining, instantaneous/EMA transfer speed, and ETA.
- Source PDFs remember their Drive file id. Repeated Save/Sync operations skip unchanged source PDFs instead of re-uploading hundreds of megabytes.
- A single untouched imported PDF uses a direct-source sync path and avoids rasterizing thousands of pages with jsPDF before uploading.
- The UI keeps a virtual page window for 3000+ page notebooks; only visible/nearby pages are mounted.
- A glass/3D transfer panel provides a single visible progress surface instead of redundant upload controls.
