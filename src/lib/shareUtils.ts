import { NotebookData, SectionData } from '../types';

export interface SharePayload {
  v: number;
  notebook: NotebookData;
  sections: SectionData[];
  sharedAt: number;
}

/**
 * Encodes a notebook payload into a URL-safe base64 string
 */
export function encodeSharePayload(notebook: NotebookData, sections: SectionData[]): string {
  const payload: SharePayload = {
    v: 1,
    notebook,
    sections,
    sharedAt: Date.now(),
  };

  const jsonStr = JSON.stringify(payload);
  try {
    // UTF-8 friendly base64 encoding
    const encoded = btoa(encodeURIComponent(jsonStr));
    return encoded;
  } catch (err) {
    console.error('Failed to encode share payload:', err);
    return '';
  }
}

/**
 * Decodes a URL-safe base64 string back into a SharePayload object
 */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed: SharePayload = JSON.parse(jsonStr);
    if (parsed && parsed.notebook && Array.isArray(parsed.sections)) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode share payload:', err);
    return null;
  }
}

/**
 * Generates a full share URL for the active notebook
 */
export function generateShareUrl(notebook: NotebookData, sections: SectionData[]): string {
  const encoded = encodeSharePayload(notebook, sections);
  if (!encoded) return window.location.href;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#share=${encoded}`;
}
