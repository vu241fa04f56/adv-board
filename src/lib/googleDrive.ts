import { getPdfMeta, PDF_CHUNK_SIZE, createPdfStore, savePdfChunk, getPdfRange, setPdfDriveFileId } from './db';
import { NotebookData, SectionData } from '../types';

export interface DriveNotebookFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
  pdfWebViewLink?: string;
}

export interface DrivePdfFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: number;
  webViewLink?: string;
}

export interface SavedNotebookPayload {
  version: number;
  notebook: NotebookData;
  sections: SectionData[];
  savedAt: number;
  // v1 used base64 here. New saves intentionally never embed PDF bytes in JSON.
  pdfBuffersMap?: {
    [pdfId: string]: {
      filename: string;
      base64: string;
      pageCount: number;
    };
  };
  pdfRefs?: {
    [pdfId: string]: {
      fileId: string;
      filename: string;
      pageCount: number;
      size?: number;
    };
  };
}

const DRIVE_FOLDER_NAME = 'OneNote PDF Studio';
const RESUMABLE_CHUNK_SIZE = 32 * 1024 * 1024; // 32 MiB: fewer HTTP round-trips for 500 MB+ files; divisible by Drive's 256 KiB requirement.

function cleanName(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

export async function getOrCreateAppFolder(accessToken: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER_NAME}' and trashed=false`
    )}&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.files?.length) return data.files[0].id;

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'],
      }),
    });
    if (!createRes.ok) return null;
    return (await createRes.json()).id;
  } catch (err) {
    console.error('[GoogleDrive] Folder error:', err);
    return null;
  }
}

async function findFileId(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<{ id: string; size?: number; webViewLink?: string } | null> {
  const q = `'${folderId}' in parents and name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,webViewLink)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0] || null;
}

async function createResumableSession(
  accessToken: string,
  folderId: string,
  fileName: string,
  size: number,
  mimeType: string,
  existingFileId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType,
    ...(existingFileId ? {} : { parents: [folderId] }),
  };

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=resumable`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw new Error(`Could not start resumable upload (${res.status}): ${await res.text()}`);
  }

  const location = res.headers.get('Location');
  if (!location) throw new Error('Google Drive did not return a resumable upload URL.');
  return location;
}

async function uploadBlobResumable(
  accessToken: string,
  folderId: string,
  fileName: string,
  blob: Blob,
  mimeType: string,
  options: {
    existingFileId?: string;
    onProgress?: (uploaded: number, total: number) => void;
  } = {}
): Promise<{ fileId: string; webViewLink?: string }> {
  const sessionUrl = await createResumableSession(
    accessToken,
    folderId,
    fileName,
    blob.size,
    mimeType,
    options.existingFileId
  );

  let offset = 0;
  let retries = 0;

  while (offset < blob.size) {
    const endExclusive = Math.min(blob.size, offset + RESUMABLE_CHUNK_SIZE);
    const chunk = blob.slice(offset, endExclusive);
    const endInclusive = endExclusive - 1;

    try {
      const res = await fetch(sessionUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Length': String(chunk.size),
          'Content-Range': `bytes ${offset}-${endInclusive}/${blob.size}`,
          'Content-Type': mimeType,
        },
        body: chunk,
      });

      if (res.status === 200 || res.status === 201) {
        const data = await res.json();
        options.onProgress?.(blob.size, blob.size);
        return { fileId: data.id, webViewLink: data.webViewLink };
      }

      if (res.status === 308) {
        const range = res.headers.get('Range');
        const match = range?.match(/bytes=0-(\d+)/);
        offset = match ? Number(match[1]) + 1 : endExclusive;
        retries = 0;
        options.onProgress?.(offset, blob.size);
        continue;
      }

      throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
    } catch (error) {
      if (++retries > 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** (retries - 1)));
    }
  }

  throw new Error('Upload ended before Google Drive returned a file.');
}

export async function savePdfToGoogleDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  pdfBlob: Blob,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ fileId: string; webViewLink?: string } | null> {
  try {
    const existing = await findFileId(accessToken, folderId, fileName);
    return await uploadBlobResumable(accessToken, folderId, fileName, pdfBlob, 'application/pdf', {
      existingFileId: existing?.id,
      onProgress,
    });
  } catch (err) {
    console.error('[GoogleDrive] Resumable PDF upload failed:', err);
    return null;
  }
}

async function uploadStoredPdfResumable(
  accessToken: string,
  folderId: string,
  fileName: string,
  pdfId: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ fileId: string; webViewLink?: string } | null> {
  const meta = await getPdfMeta(pdfId);
  if (!meta) return null;

  const existing = await findFileId(accessToken, folderId, fileName);
  // Do not re-upload an unchanged source PDF on every Save/Sync. Persist the
  // Drive id locally, and adopt a same-size existing file for older projects.
  if (meta.driveFileId && existing?.id === meta.driveFileId) {
    onProgress?.(meta.size, meta.size);
    return { fileId: meta.driveFileId, webViewLink: existing.webViewLink };
  }
  if (existing?.id && typeof existing.size === 'number' && existing.size === meta.size) {
    await setPdfDriveFileId(pdfId, existing.id);
    onProgress?.(meta.size, meta.size);
    return { fileId: existing.id, webViewLink: existing.webViewLink };
  }

  const sessionUrl = await createResumableSession(
    accessToken,
    folderId,
    fileName,
    meta.size,
    'application/pdf',
    existing?.id
  );

  let offset = 0;
  let retries = 0;

  while (offset < meta.size) {
    const end = Math.min(meta.size, offset + RESUMABLE_CHUNK_SIZE);
    const bytes = await getPdfRange(pdfId, offset, end);

    try {
      const res = await fetch(sessionUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Length': String(bytes.byteLength),
          'Content-Range': `bytes ${offset}-${end - 1}/${meta.size}`,
          'Content-Type': 'application/pdf',
        },
        body: bytes,
      });

      if (res.status === 200 || res.status === 201) {
        const data = await res.json();
        await setPdfDriveFileId(pdfId, data.id);
        onProgress?.(meta.size, meta.size);
        return { fileId: data.id, webViewLink: data.webViewLink };
      }

      if (res.status === 308) {
        const range = res.headers.get('Range');
        const match = range?.match(/bytes=0-(\d+)/);
        offset = match ? Number(match[1]) + 1 : end;
        retries = 0;
        onProgress?.(offset, meta.size);
        continue;
      }

      throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
    } catch (error) {
      if (++retries > 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** (retries - 1)));
    }
  }

  return null;
}

export async function saveNotebookToGoogleDrive(
  accessToken: string,
  notebook: NotebookData,
  sections: SectionData[],
  pdfBlob?: Blob,
  _legacyGetPdfBufferFn?: (id: string) => Promise<{ filename: string; data: ArrayBuffer; pageCount: number } | undefined>,
  onProgress?: (uploaded: number, total: number, label: string) => void,
  primaryPdfId?: string
): Promise<{ success: boolean; fileId?: string; pdfFileId?: string; webViewLink?: string; error?: string }> {
  try {
    const folderId = await getOrCreateAppFolder(accessToken);
    if (!folderId) return { success: false, error: 'Could not access Google Drive folder' };

    const cleanTitle = cleanName(notebook.title);
    let pdfFileId: string | undefined;
    let pdfWebViewLink: string | undefined;

    if (pdfBlob) {
      const result = await savePdfToGoogleDrive(
        accessToken,
        folderId,
        `${cleanTitle}.pdf`,
        pdfBlob,
        (done, total) => onProgress?.(done, total, 'Annotated PDF')
      );
      if (!result) return { success: false, error: 'Large PDF upload failed.' };
      pdfFileId = result.fileId;
      pdfWebViewLink = result.webViewLink;
    } else if (primaryPdfId) {
      // Fast path: an untouched imported PDF can be copied directly from the
      // local IndexedDB chunk store to Drive. This avoids rasterizing 3000+
      // pages with jsPDF before upload.
      const meta = await getPdfMeta(primaryPdfId);
      if (meta) {
        const result = await uploadStoredPdfResumable(
          accessToken,
          folderId,
          `${cleanTitle}.pdf`,
          primaryPdfId,
          (done, total) => onProgress?.(done, total, 'Original PDF')
        );
        if (!result) return { success: false, error: 'Large PDF upload failed.' };
        pdfFileId = result.fileId;
        pdfWebViewLink = result.webViewLink;
      }
    }

    // Store source PDFs as separate resumable Drive files. The notebook JSON
    // contains only metadata/file IDs, never 500+ MB base64 strings.
    const pdfRefs: SavedNotebookPayload['pdfRefs'] = {};
    const pdfIds = new Set<string>();
    for (const sec of sections) {
      for (const page of sec.pages || []) {
        if (page.pdfId) pdfIds.add(page.pdfId);
      }
    }

    let sourceIndex = 0;
    for (const pdfId of pdfIds) {
      const meta = await getPdfMeta(pdfId);
      if (!meta) continue;
      sourceIndex++;
      if (primaryPdfId && pdfId === primaryPdfId && pdfFileId) {
        // The primary PDF upload is already the canonical source file. Reuse
        // that Drive id instead of uploading the same 500+ MB bytes again.
        pdfRefs[pdfId] = {
          fileId: pdfFileId,
          filename: meta.filename,
          pageCount: meta.pageCount,
          size: meta.size,
        };
        continue;
      }
      const sourceName = `${cleanTitle} - Source ${sourceIndex} - ${cleanName(meta.filename)}`;
      const result = await uploadStoredPdfResumable(
        accessToken,
        folderId,
        sourceName,
        pdfId,
        (done, total) => onProgress?.(done, total, `Source PDF ${sourceIndex}`)
      );
      if (result) {
        pdfRefs[pdfId] = {
          fileId: result.fileId,
          filename: meta.filename,
          pageCount: meta.pageCount,
          size: meta.size,
        };
      }
    }

    const fileName = `${cleanTitle}_${notebook.id}.onenote.json`;
    const payload: SavedNotebookPayload = {
      version: 2,
      notebook,
      sections,
      savedAt: Date.now(),
      pdfRefs,
    };
    const contentString = JSON.stringify(payload, null, 2);

    const existing = await findFileId(accessToken, folderId, fileName);
    let jsonFileId: string | undefined;

    // Notebook JSON is small, so a normal request is fine.
    if (existing) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=id,name`;
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: contentString,
      });
      if (!res.ok) throw new Error(`Notebook metadata update failed (${res.status})`);
      jsonFileId = existing.id;
    } else {
      const boundary = '-------one-note-json-boundary';
      const body = new Blob([
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify({ name: fileName, parents: [folderId], mimeType: 'application/json' }),
        `\r\n--${boundary}\r\n`,
        'Content-Type: application/json\r\n\r\n',
        contentString,
        `\r\n--${boundary}--`,
      ], { type: `multipart/related; boundary=${boundary}` });

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body,
        }
      );
      if (!res.ok) throw new Error(`Notebook metadata creation failed (${res.status})`);
      jsonFileId = (await res.json()).id;
    }

    return {
      success: true,
      fileId: jsonFileId,
      pdfFileId,
      webViewLink: pdfWebViewLink,
    };
  } catch (err: any) {
    console.error('[GoogleDrive] Error saving notebook:', err);
    return { success: false, error: err?.message || 'Drive save failed' };
  }
}

/**
 * Download a Google Drive PDF directly into IndexedDB in 8 MiB chunks.
 * Only one chunk is held in memory at a time.
 */
export async function downloadPdfToStore(
  accessToken: string,
  file: DrivePdfFile,
  pdfId: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<{ pageCount: number; size: number }> {
  if (!file.size || file.size <= 0) throw new Error('Google Drive did not provide the PDF size.');

  // We don't know page count until PDF.js parses the range-backed file.
  await createPdfStore(pdfId, file.name, file.size, 0, {
    source: 'drive',
    driveFileId: file.id,
  });

  let downloaded = 0;
  const chunkCount = Math.ceil(file.size / PDF_CHUNK_SIZE);
  // Independent Range requests can run in parallel. Keep only one 16 MiB
  // block per worker in memory, then commit it straight to IndexedDB.
  const concurrency = file.size >= 256 * 1024 * 1024 ? 3 : 2;
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= chunkCount) return;
      const start = index * PDF_CHUNK_SIZE;
      const end = Math.min(file.size - 1, start + PDF_CHUNK_SIZE - 1);
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Range: `bytes=${start}-${end}`,
              },
            }
          );

          if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
          const blob = await res.blob();
          const expected = end - start + 1;
          if (blob.size !== expected) {
            throw new Error(`Drive returned ${blob.size} bytes; expected ${expected}.`);
          }

          await savePdfChunk(pdfId, index, blob);
          downloaded += blob.size;
          onProgress?.(downloaded, file.size);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
        }
      }

      if (lastError) throw lastError;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunkCount) }, () => worker())
  );

  // Page count is filled in by the importer after PDF.js parses the file.
  return { pageCount: 0, size: file.size };
}

/**
 * Lists notebooks stored in the OneNote PDF Studio Google Drive folder
 */
export async function listNotebooksFromDrive(accessToken: string): Promise<DriveNotebookFile[]> {
  try {
    const folderId = await getOrCreateAppFolder(accessToken);
    if (!folderId) return [];

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `'${folderId}' in parents and trashed=false`
    )}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const allFiles: any[] = data.files || [];

    const jsonFiles = allFiles.filter((f) => f.name.includes('.onenote.json'));
    const pdfMap = new Map<string, string>(); // cleanTitle -> pdf webViewLink

    for (const f of allFiles) {
      if (f.name.endsWith('.pdf')) {
        const titleWithoutPdf = f.name.replace(/\.pdf$/i, '');
        pdfMap.set(titleWithoutPdf, f.webViewLink);
      }
    }

    return jsonFiles.map((f) => {
      const cleanTitle = f.name
        .replace(/_[a-zA-Z0-9_-]+\.onenote\.json$/, '')
        .replace(/\.onenote\.json$/, '');
      return {
        id: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
        pdfWebViewLink: pdfMap.get(cleanTitle),
      };
    });
  } catch (err) {
    console.error('[GoogleDrive] Error listing notebooks:', err);
    return [];
  }
}

/**
 * Loads a notebook payload from Google Drive by fileId
 */
export async function loadNotebookFromDrive(
  accessToken: string,
  fileId: string
): Promise<SavedNotebookPayload | null> {
  try {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;

    const payload: SavedNotebookPayload = await res.json();
    return payload;
  } catch (err) {
    console.error('[GoogleDrive] Error loading notebook from Drive:', err);
    return null;
  }
}

/**
 * Searches and lists PDF files from user's Google Drive account
 */
export async function listPdfFilesFromDrive(
  accessToken: string,
  searchQuery?: string
): Promise<DrivePdfFile[]> {
  try {
    let q = "mimeType='application/pdf' and trashed=false";
    if (searchQuery && searchQuery.trim().length > 0) {
      const cleanQuery = searchQuery.trim().replace(/'/g, "\\'");
      q += ` and name contains '${cleanQuery}'`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc&pageSize=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn('[GoogleDrive] Failed to list PDFs from Drive:', await res.text());
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      size: f.size ? parseInt(f.size, 10) : undefined,
      webViewLink: f.webViewLink,
    }));
  } catch (err) {
    console.error('[GoogleDrive] Error listing PDF files:', err);
    return [];
  }
}
