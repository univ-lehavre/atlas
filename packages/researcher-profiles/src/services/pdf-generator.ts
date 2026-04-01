/**
 * Generates a combined PDF with two sections:
 *   1. Références vérifiées (Chicago Notes)
 *   2. En attente de vérification (Chicago Notes)
 */

import PDFDocument from "pdfkit";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

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

/**
 * Generates a combined PDF with:
 *   - Section 1: "Références vérifiées" (finalReferences, Chicago Notes)
 *   - Section 2: "En attente de vérification" (pendingReferences, Chicago Notes)
 */
export const generateCombinedPdf = (
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
