import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  extractRawText: vi.fn(),
  createWorker: vi.fn(),
  createCanvas: vi.fn(),
  domParserCtor: vi.fn(),
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: (opts: unknown) => mocks.getDocument(opts),
}));

vi.mock("mammoth", () => ({
  extractRawText: mocks.extractRawText,
}));

vi.mock("@napi-rs/canvas", () => ({
  createCanvas: mocks.createCanvas,
}));

vi.mock("tesseract.js", () => ({
  createWorker: mocks.createWorker,
}));

vi.mock("@xmldom/xmldom", () => ({
  DOMParser: function MockDomParser() {
    mocks.domParserCtor();
  },
}));

import { extractText, isPdfjsFontWarning } from "./file-extractor.js";

const txtBuffer = (s: string): ArrayBuffer =>
  new TextEncoder().encode(s).buffer as ArrayBuffer;

const pdfHeader = (): ArrayBuffer => {
  const arr = new Uint8Array(8);
  arr.set([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  return arr.buffer;
};

const docxHeader = (): ArrayBuffer => {
  const arr = new Uint8Array(8);
  arr.set([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
  return arr.buffer;
};

const fakePage = (text: string) => ({
  getViewport: () => ({ width: 100, height: 100 }),
  getTextContent: () =>
    Promise.resolve({
      items: text.split(" ").map((str) => ({ str })),
    }),
  render: () => ({ promise: Promise.resolve() }),
});

const longText = "Lorem ipsum dolor sit amet ".repeat(40);

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
});

describe("isPdfjsFontWarning", () => {
  it("matches the three known pdfjs font warning shapes", () => {
    expect(isPdfjsFontWarning("Unable to load font data: foo")).toBe(true);
    expect(isPdfjsFontWarning("standardFontDataUrl was missing")).toBe(true);
    expect(isPdfjsFontWarning("TT: undefined function 32")).toBe(true);
  });

  it("ignores unrelated strings and non-string inputs", () => {
    expect(isPdfjsFontWarning("Some unrelated warning")).toBe(false);
    expect(isPdfjsFontWarning(42)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined -- forces the typeof guard branch
    expect(isPdfjsFontWarning(undefined)).toBe(false);
  });
});

describe("module-level console.warn override", () => {
  // file-extractor swaps console.warn at import time. Calling it with each
  // shape exercises both legs of the inline `if (isPdfjsFontWarning(...))`,
  // even if we don't assert on the (mostly invisible) side effects.
  it("accepts both filtered and unrelated warnings without throwing", () => {
    expect(() => {
      console.warn("Unable to load font data: foo");
      console.warn("standardFontDataUrl problem");
      console.warn("TT: undefined function");
    }).not.toThrow();
  });

  it("forwards unrelated warnings to the original handler", () => {
    expect(() => {
      console.warn("plain unrelated warning");
    }).not.toThrow();
  });
});

describe("extractText", () => {
  it("decodes plain text buffers without invoking heavy parsers", async () => {
    const text = await Effect.runPromise(extractText(txtBuffer("hello world")));
    expect(text).toBe("hello world");
    expect(mocks.getDocument).not.toHaveBeenCalled();
    expect(mocks.extractRawText).not.toHaveBeenCalled();
  });

  it("extracts text from a PDF when content is non-empty and clean", async () => {
    const page = fakePage(longText);
    mocks.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve(page),
      }),
    });

    const text = await Effect.runPromise(extractText(pdfHeader()));
    expect(text).toContain("Lorem");
  });

  it("falls back to OCR when extracted text is too sparse", async () => {
    const sparsePage = fakePage("a");
    mocks.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve(sparsePage),
      }),
    });
    mocks.createCanvas.mockReturnValue({
      getContext: () => ({}),
      toBuffer: () => Buffer.from([1, 2, 3]),
    });
    const recognize = vi.fn().mockResolvedValue({ data: { text: "OCR text" } });
    const terminate = vi.fn(() => Promise.resolve());
    mocks.createWorker.mockResolvedValue({ recognize, terminate });

    const text = await Effect.runPromise(extractText(pdfHeader()));
    expect(text).toBe("OCR text");
    expect(recognize).toHaveBeenCalled();
    expect(terminate).toHaveBeenCalled();
  });

  it("extracts text from a DOCX via mammoth", async () => {
    mocks.extractRawText.mockResolvedValue({ value: "docx body" });

    const text = await Effect.runPromise(extractText(docxHeader()));
    expect(text).toBe("docx body");
    expect(mocks.extractRawText).toHaveBeenCalled();
  });

  it("wraps PDF parsing failures into FileExtractError", async () => {
    mocks.getDocument.mockReturnValue({
      promise: Promise.reject(new Error("corrupt pdf")),
    });

    const exit = await Effect.runPromiseExit(extractText(pdfHeader()));
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("wraps DOCX parsing failures into FileExtractError", async () => {
    mocks.extractRawText.mockRejectedValue(new Error("corrupt docx"));

    const exit = await Effect.runPromiseExit(extractText(docxHeader()));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});
