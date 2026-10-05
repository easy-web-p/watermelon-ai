/**
 * Client-side export helpers.
 *
 * "ส่งออก PDF" uses the browser's own print-to-PDF rather than shipping a PDF
 * library — it keeps the bundle small, renders the Thai typeface correctly
 * (jsPDF needs an embedded Thai font), and gives the farmer a real print option
 * for taking the sheet into the field.
 */

/** Opens the print dialog with only `element` visible. */
export function printElement(element: HTMLElement | null, documentTitle: string) {
  if (!element) {
    window.print();
    return;
  }

  const previousTitle = document.title;
  document.title = documentTitle;
  element.setAttribute('data-print-target', 'true');
  document.body.classList.add('is-printing');

  let cleanedUp = false;
  let safetyTimer = 0;
  const cleanup = () => {
    // Both the event and the Safari fallback call this, and a second run
    // would restore an already-restored title over the next print job's.
    if (cleanedUp) return;
    cleanedUp = true;
    window.clearTimeout(safetyTimer);
    document.body.classList.remove('is-printing');
    element.removeAttribute('data-print-target');
    document.title = previousTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // Safari does not always fire afterprint.
  safetyTimer = window.setTimeout(cleanup, 1500);
}

/**
 * Triggers a download of `content` as a file.
 *
 * Two details decide whether the file actually arrives: Firefox ignores a
 * `click()` on an anchor that is not in the document, and revoking the
 * object URL in the same tick can cancel a download that has not started
 * yet. Both used to be wrong here, so "ส่งออก CSV" silently did nothing.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Freed once the browser has had a turn to start the transfer.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Rows → CSV with a BOM so Excel opens Thai text correctly. */
export function downloadCsv(filename: string, headers: readonly string[], rows: readonly (readonly string[])[]) {
  const escape = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  downloadFile(`﻿${body}`, filename, 'text/csv;charset=utf-8');
}

/** Copies text, falling back to a hidden textarea where the API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Formats a BibTeX entry from a publication record. */
export function toBibTeX(paper: {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
}): string {
  const key = `watermelonai${paper.year}${paper.id.replace(/[^a-z0-9]/gi, '')}`;
  return [
    `@article{${key},`,
    `  title   = {${paper.title}},`,
    `  author  = {${paper.authors.replace(/,\s*/g, ' and ')}},`,
    `  journal = {${paper.venue}},`,
    `  year    = {${paper.year}},`,
    `  note    = {Watermelon AI Research}`,
    `}`,
  ].join('\n');
}
