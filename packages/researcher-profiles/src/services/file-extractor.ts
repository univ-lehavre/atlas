/**
 * Extracts plain text from PDF, DOCX, or TXT ArrayBuffer.
 */

import { Effect, Data } from "effect";

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

const extractPdf = (
  buffer: ArrayBuffer,
): Effect.Effect<string, FileExtractError> =>
  Effect.tryPromise({
    try: async () => {
      // eslint-disable-next-line n/no-missing-import -- pdfjs-dist legacy build for Node.js
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      });
      const pdf = await loadingTask.promise;
      const pageTexts = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          return content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
        }),
      );
      return pageTexts.join("\n");
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
