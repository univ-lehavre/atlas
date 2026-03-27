/**
 * Generates a PDF document with references formatted in APA-like style.
 */

import PDFDocument from "pdfkit";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

const formatAuthors = (work: WorksResult): string => {
  const authors = work.authorships.map((a) => {
    const parts = a.author.display_name.split(" ");
    if (parts.length < 2) return a.author.display_name;
    const lastName = parts.at(-1) ?? "";
    const initials = parts
      .slice(0, -1)
      .map((p) => `${p.charAt(0)}.`)
      .join(" ");
    return `${lastName}, ${initials}`;
  });
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0] ?? "";
  return `${authors.slice(0, -1).join(", ")}, & ${authors.at(-1) ?? ""}`;
};

const formatReference = (work: WorksResult): string => {
  const authors = formatAuthors(work);
  const year =
    work.publication_year > 0 ? `(${String(work.publication_year)})` : "(n.d.)";
  const title = work.title ?? work.display_name ?? "";
  const doi =
    work.doi !== null && work.doi !== undefined && work.doi !== ""
      ? `https://doi.org/${work.doi.replace(/^https?:\/\/doi\.org\//, "")}`
      : "";
  return [authors, year, title, doi].filter(Boolean).join(". ") + ".";
};

const renderDoc = (
  doc: PDFKit.PDFDocument,
  works: readonly WorksResult[],
  researcherName: string,
): void => {
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(`References — ${researcherName}`, { align: "left" });
  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`${String(works.length)} reference(s) · APA-like format`, {
      align: "left",
    });
  doc.moveDown(1.5);

  const sorted = [...works].sort(
    (a, b) => b.publication_year - a.publication_year,
  );

  for (const [index, work] of sorted.entries()) {
    const ref = formatReference(work);
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

  doc.end();
};

/**
 * Generates a PDF buffer with references formatted in APA-like style.
 */
export const generateReferencesPdf = (
  works: readonly WorksResult[],
  researcherName: string,
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

    renderDoc(doc, works, researcherName);
  });
