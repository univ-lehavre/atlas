/**
 * Interactive multiselect for choosing which researchers to process.
 */

import { multiselect, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import type { ResearcherRow } from "@univ-lehavre/atlas-researcher-profiles";
import { daysUntilNextUpdate } from "@univ-lehavre/atlas-researcher-profiles";

const relativeDate = (dateStr: string): string => {
  if (dateStr === "") return "";
  const days = daysUntilNextUpdate(dateStr);
  if (days !== null) return `update in ${String(days)}d`;
  const d = new Date(dateStr);
  return `imported ${d.toISOString().slice(0, 10)}`;
};

/**
 * Prompts the user to select which researchers to process.
 * @param preselectAll - If true, all researchers are pre-selected.
 */
export const selectResearchers = async (
  researchers: readonly ResearcherRow[],
  preselectAll = false,
): Promise<readonly ResearcherRow[]> => {
  const sorted = [...researchers].toSorted((a, b) =>
    a.last_name.localeCompare(b.last_name, "fr"),
  );
  const selected = await multiselect({
    message: `Select researchers to process (${pc.bold(String(researchers.length))} total):`,
    initialValues: preselectAll ? sorted.map((r) => r.userid) : [],
    options: sorted.map((r) => {
      const importDate = relativeDate(r.oa_imported_at);
      const orcidHint =
        r.orcid !== "" && r.orcid !== "null" ? `ORCID: ${r.orcid}` : r.userid;
      const lockHint = r.oa_locked_at !== "" ? pc.red(" [LOCKED]") : "";
      const hint =
        importDate !== ""
          ? `${orcidHint} · ${importDate}${lockHint}`
          : `${orcidHint}${lockHint}`;
      return {
        value: r.userid,
        label: `${r.first_name} ${r.last_name}`,
        hint,
      };
    }),
  });

  if (isCancel(selected)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const selectedIds = Array.isArray(selected) ? selected : [];
  return researchers.filter((r) => selectedIds.includes(r.userid));
};
