/**
 * Interactive multiselect for choosing which researchers to process.
 */

import { multiselect, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import type { ResearcherRow } from "../types.js";
import { daysUntilNextUpdate } from "./process-row.js";

const relativeDate = (dateStr: string): string => {
  if (dateStr === "") return "";
  const days = daysUntilNextUpdate(dateStr);
  if (days !== null) return `update in ${String(days)}d`;
  const d = new Date(dateStr);
  return `imported ${d.toISOString().slice(0, 10)}`;
};

/**
 * Prompts the user to select which researchers to process.
 * All researchers are pre-selected by default.
 */
export const selectResearchers = async (
  researchers: readonly ResearcherRow[],
): Promise<readonly ResearcherRow[]> => {
  const selected = await multiselect({
    message: `Select researchers to process (${pc.bold(String(researchers.length))} total):`,
    options: [...researchers]
      .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"))
      .map((r) => {
        const authorDate = relativeDate(r.oa_author_ids_imported_date);
        const worksDate = relativeDate(r.oa_references_imported_at);
        const dateParts = [authorDate, worksDate].filter((s) => s !== "");
        const orcidHint =
          r.orcid !== "" && r.orcid !== "null" ? `ORCID: ${r.orcid}` : r.userid;
        const hint =
          dateParts.length > 0
            ? `${orcidHint} · authors: ${dateParts[0] ?? ""} · works: ${dateParts[1] ?? ""}`
            : orcidHint;
        return {
          value: r.userid,
          label: `${r.first_name} ${r.last_name}`,
          hint,
        };
      }),
    initialValues: [],
  });

  if (isCancel(selected)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  return researchers.filter((r) =>
    (selected as readonly string[]).includes(r.userid),
  );
};
