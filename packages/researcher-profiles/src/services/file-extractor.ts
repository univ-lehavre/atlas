/**
 * Extracts plain text from PDF, DOCX, or TXT ArrayBuffer.
 * Falls back to OCR (tesseract.js) for scanned PDFs with insufficient text.
 */

import { Effect, Data } from "effect";

// Suppress pdfjs font warnings globally — missing standard fonts don't affect text extraction
const _origWarn = console.warn;

console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  // eslint-disable-next-line functional/no-conditional-statements -- early return for side-effect filter
  if (
    msg.includes("Unable to load font data") ||
    msg.includes("standardFontDataUrl") ||
    msg.startsWith("TT:")
  ) {
    return;
  }

  _origWarn(...args);
};

class FileExtractError extends Data.TaggedError("FileExtractError")<{
  readonly cause: unknown;
}> {}

type FileType = "pdf" | "docx" | "txt";

/**
 * Detects file type from the first bytes of the ArrayBuffer.
 */
const detectType = (buffer: ArrayBuffer): FileType => {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const isPdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  const isDocx =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  return isPdf ? "pdf" : isDocx ? "docx" : "txt";
};

// eslint-disable-next-line functional/no-mixed-types -- pdfjs interface requires both data and function members
interface PdfjsDoc {
  readonly numPages: number;
  readonly getPage: (n: number) => Promise<PdfjsPage>;
}
interface PdfjsPage {
  readonly getViewport: (opts: { scale: number }) => {
    width: number;
    height: number;
  };
  readonly getTextContent: () => Promise<{ items: { str?: string }[] }>;
  readonly render: (opts: {
    canvasContext: unknown;
    canvas: unknown;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}

const loadPdfjsDoc = async (
  buffer: ArrayBuffer | Uint8Array,
): Promise<PdfjsDoc> => {
  // Copy to avoid detaching the original buffer
  const data =
    buffer instanceof Uint8Array
      ? buffer.slice()
      : new Uint8Array(buffer.slice(0));
  const { createRequire } = await import("node:module");
  // eslint-disable-next-line unicorn/import-style -- default import required for path operations
  const nodePath = await import("node:path");
  const pdfjsLib =
    // eslint-disable-next-line n/no-missing-import -- pdfjs-dist legacy build for Node.js
    (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as {
      getDocument: (opts: unknown) => { promise: Promise<PdfjsDoc> };
    };
  const require = createRequire(import.meta.url);
  const pdfjsDir = nodePath.default.dirname(
    require.resolve("pdfjs-dist/package.json"),
  );
  const standardFontDataUrl = new URL(
    "file://" + nodePath.default.join(pdfjsDir, "standard_fonts/"),
  ).href;
  return pdfjsLib.getDocument({ data, standardFontDataUrl }).promise;
};

/**
 * Returns true if text looks garbled: too many isolated commas or low word ratio.
 * Typical of PDFs with private font encoding (e.g. HAL exports).
 */
const isGarbled = (text: string): boolean => {
  const tokens = text.trim().split(/\s+/);
  const commas = tokens.filter((t) => t === ",").length;
  const commaRatio = tokens.length === 0 ? 1 : commas / tokens.length;
  const words = tokens.filter((t) => /^[\w\u00C0-\u024F'-]{2,}$/u.test(t));
  const wordRatio = tokens.length === 0 ? 0 : words.length / tokens.length;
  return tokens.length === 0 || commaRatio > 0.15 || wordRatio < 0.3;
};

const renderPageToText = async (
  worker: { recognize: (buf: Buffer) => Promise<{ data: { text: string } }> },
  page: PdfjsPage,
): Promise<string> => {
  const { createCanvas } = await import("@napi-rs/canvas");
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  // eslint-disable-next-line functional/no-expression-statements -- rendering side effect
  await page.render({
    canvasContext: canvas.getContext("2d"),
    canvas,
    viewport,
  }).promise;
  const { data } = await worker.recognize(canvas.toBuffer("image/png"));
  return data.text;
};

const ocrPdf = async (buffer: ArrayBuffer): Promise<string> => {
  // eslint-disable-next-line n/no-missing-import -- tesseract.js is installed
  const { createWorker } = await import("tesseract.js");
  const pdf = await loadPdfjsDoc(buffer.slice(0));
  const worker = await createWorker("fra+eng");
  const results: string[] = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1);
      return renderPageToText(
        worker as Parameters<typeof renderPageToText>[0],
        page,
      );
    }),
  );
  // eslint-disable-next-line functional/no-expression-statements -- terminate worker side effect
  await worker.terminate();
  return results
    .join(" ")
    .replaceAll("\n", " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
};

const extractPdf = (
  buffer: ArrayBuffer,
): Effect.Effect<string, FileExtractError> =>
  Effect.tryPromise({
    try: async () => {
      const pdf = await loadPdfjsDoc(buffer.slice(0));
      const pageTexts = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          return content.items
            .map((item) => ("str" in item ? (item.str ?? "") : ""))
            .join(" ");
        }),
      );
      const raw = pageTexts
        .join(" ")
        .replaceAll("\n", " ")
        .replaceAll(/\s+/gu, " ")
        .trim();
      // Fall back to OCR if text is too sparse or mostly garbled (private font encoding)
      // eslint-disable-next-line functional/no-conditional-statements -- branching on extraction quality
      if (raw.length < 200 || isGarbled(raw)) {
        return ocrPdf(buffer);
      }
      // Remove isolated sequences of non-Latin symbols (garbled glyphs from private fonts)
      // Keep: ASCII + Latin extended (accents) + common punctuation
      return raw
        .replaceAll(
          // eslint-disable-next-line no-control-regex -- intentionally matching control chars as part of garbled glyph detection
          /[^\u0000-\u007F\u00C0-\u024F\u2018\u2019\u201C\u201D\u2013\u2014\s]{2,}/gu,
          " ",
        )
        .replaceAll(/\s+/gu, " ")
        .trim();
    },
    catch: (cause) => new FileExtractError({ cause }),
  });

const extractDocx = (
  buffer: ArrayBuffer,
): Effect.Effect<string, FileExtractError> =>
  Effect.tryPromise({
    try: async () => {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value;
    },
    catch: (cause) => new FileExtractError({ cause }),
  });

const extractTxt = (
  buffer: ArrayBuffer,
): Effect.Effect<string, FileExtractError> =>
  Effect.try({
    try: () => new TextDecoder("utf8").decode(buffer),
    catch: (cause) => new FileExtractError({ cause }),
  });

const extractors: Record<
  FileType,
  (buf: ArrayBuffer) => Effect.Effect<string, FileExtractError>
> = {
  pdf: extractPdf,
  docx: extractDocx,
  txt: extractTxt,
};

/**
 * Extracts plain text from a file ArrayBuffer.
 * Supports PDF, DOCX, and plain text files.
 */
export const extractText = (
  buffer: ArrayBuffer,
): Effect.Effect<string, FileExtractError> =>
  extractors[detectType(buffer)](buffer);
