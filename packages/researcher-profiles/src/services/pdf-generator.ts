/**
 * Generates a combined PDF with:
 *   1. Annexe — Données de résolution (debug appendix)
 *   2. PDF du champ publications (if provided)
 *   3. Références vérifiées (Chicago Notes)
 *   4. En attente de vérification (Chicago Notes)
 */

import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

export interface PdfDebugInfo {
  /** All unique OpenAlex author profiles resolved for this researcher */
  readonly authorProfiles: readonly {
    readonly id: string;
    readonly display_name: string;
    readonly selected: boolean;
  }[];
  /** All raw_author_name values found in oa_references authorships */
  readonly rawAuthorNames: readonly {
    readonly name: string;
    readonly selected: boolean;
  }[];
  /** The extracted text that was submitted to fuzzy matching */
  readonly extractedText: string;
  /** Raw bytes of the publications PDF field, inserted after the extracted text */
  readonly publicationsPdfBytes?: Uint8Array;
}

const formatAuthorsChicago = (work: WorksResult): string => {
  const authors = work.authorships.map((a) => {
    const name = a.author.display_name ?? "";
    const parts = name.split(" ");
    if (parts.length < 2) return name;
    const lastName = parts.at(-1) ?? "";
    const firstNames = parts.slice(0, -1).join(" ");
    return `${lastName}, ${firstNames}`;
  });
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0] ?? "";
  return `${authors.slice(0, -1).join(", ")}, and ${authors.at(-1) ?? ""}`;
};

const formatReferenceChicago = (work: WorksResult): string => {
  const authors = formatAuthorsChicago(work);
  const year =
    work.publication_year > 0 ? String(work.publication_year) : "n.d.";
  const title = `"${work.title ?? work.display_name ?? ""}"`;
  const doi =
    work.doi !== null && work.doi !== undefined && work.doi !== ""
      ? `https://doi.org/${work.doi.replace(/^https?:\/\/doi\.org\//, "")}`
      : "";
  return [authors, title, year, doi].filter(Boolean).join(". ") + ".";
};

const makePdf = (
  render: (doc: PDFKit.PDFDocument) => void,
): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    doc.on("error", reject);
    render(doc);
    doc.end();
  });

const renderSection = (
  doc: PDFKit.PDFDocument,
  title: string,
  works: readonly WorksResult[],
): void => {
  doc.fontSize(13).font("Helvetica-Bold").text(title, { align: "left" });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`${String(works.length)} référence(s)`, { align: "left" });
  doc.moveDown(1);

  if (works.length === 0) {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#888888")
      .text("Aucune référence.", { align: "left" });
    doc.fillColor("#000000");
    return;
  }

  const sorted = [...works].toSorted(
    (a, b) => b.publication_year - a.publication_year,
  );

  for (const [index, work] of sorted.entries()) {
    const ref = formatReferenceChicago(work);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${String(index + 1)}. ${ref}`, {
        align: "left",
        indent: 20,
        lineGap: 2,
      });
    doc.moveDown(0.6);
  }
};

const generateDebugPdf = (debug: PdfDebugInfo): Promise<Uint8Array> =>
  makePdf((doc) => {
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Annexe — Données de résolution", { align: "left" });
    doc.moveDown(1.5);

    // Author profiles
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Profils OpenAlex", { align: "left" });
    doc.moveDown(0.5);
    for (const profile of debug.authorProfiles) {
      const color = profile.selected ? "#000000" : "#999999";
      const marker = profile.selected ? "✓" : "○";
      doc
        .fontSize(9)
        .font(profile.selected ? "Helvetica-Bold" : "Helvetica")
        .fillColor(color)
        .text(`${marker}  ${profile.display_name}  (${profile.id})`, {
          align: "left",
          lineGap: 2,
        });
    }
    doc.fillColor("#000000").moveDown(1.5);

    // Raw author names
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Variantes de noms (raw_author_name)", { align: "left" });
    doc.moveDown(0.5);
    for (const entry of debug.rawAuthorNames) {
      const color = entry.selected ? "#000000" : "#999999";
      const marker = entry.selected ? "✓" : "○";
      doc
        .fontSize(9)
        .font(entry.selected ? "Helvetica-Bold" : "Helvetica")
        .fillColor(color)
        .text(`${marker}  ${entry.name}`, { align: "left", lineGap: 2 });
    }
    doc.fillColor("#000000").moveDown(1.5);

    // Extracted text
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Texte extrait (soumis au fuzzy matching)", { align: "left" });
    doc.moveDown(0.5);
    // Truncate to avoid huge PDFs — 8000 chars is plenty for inspection
    const preview =
      debug.extractedText.length > 8000
        ? debug.extractedText.slice(0, 8000) + "\n[…tronqué]"
        : debug.extractedText;
    doc
      .fontSize(7.5)
      .font("Courier")
      .fillColor("#333333")
      .text(preview, { align: "left", lineGap: 1 });
    doc.fillColor("#000000");
  });

const generateReferencesPdf = (
  finalReferences: readonly WorksResult[],
  pendingReferences: readonly WorksResult[],
  researcherName: string,
): Promise<Uint8Array> =>
  makePdf((doc) => {
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(`Références — ${researcherName}`, { align: "left" });
    doc.moveDown(1.5);

    renderSection(doc, "Références vérifiées", finalReferences);
    doc.moveDown(1.5);
    renderSection(doc, "En attente de vérification", pendingReferences);
  });

/**
 * Generates a combined PDF with:
 *   1. Annexe — Données de résolution (debug appendix, if provided)
 *   2. PDF du champ publications (if provided, inserted after extracted text)
 *   3. Références vérifiées — data.final_references (Chicago Notes)
 *   4. En attente de vérification — oa_references not in final_references (Chicago Notes)
 */
export const generateCombinedPdf = async (
  finalReferences: readonly WorksResult[],
  pendingReferences: readonly WorksResult[],
  researcherName: string,
  debugInfo?: PdfDebugInfo,
): Promise<Uint8Array> => {
  const [debugPdf, refPdf] = await Promise.all([
    debugInfo === undefined ? undefined : generateDebugPdf(debugInfo),
    generateReferencesPdf(finalReferences, pendingReferences, researcherName),
  ]);

  const parts: Uint8Array[] = [];
  if (debugPdf !== undefined) {
    parts.push(debugPdf);
    if (debugInfo?.publicationsPdfBytes !== undefined) {
      parts.push(debugInfo.publicationsPdfBytes);
    }
  }
  parts.push(refPdf);

  if (parts.length === 1) {
    return refPdf;
  }

  const merged = await PDFLibDocument.create();
  for (const part of parts) {
    const src = await PDFLibDocument.load(part);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }
  return merged.save();
};
