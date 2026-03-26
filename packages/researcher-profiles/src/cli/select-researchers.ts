/**
 * Interactive multiselect for choosing which researchers to process.
 */

import { multiselect, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import type { ResearcherRow } from "../types.js";

/**
 * Prompts the user to select which researchers to process.
 * All researchers are pre-selected by default.
 */
export const selectResearchers = async (
  researchers: readonly ResearcherRow[],
): Promise<readonly ResearcherRow[]> => {
  const selected = await multiselect({
    message: `Select researchers to process (${pc.bold(String(researchers.length))} total):`,
    options: researchers.map((r) => ({
      value: r.userid,
      label: `${r.first_name} ${r.last_name}`,
      hint:
        r.orcid !== "" && r.orcid !== "null" ? `ORCID: ${r.orcid}` : r.userid,
    })),
    initialValues: researchers.map((r) => r.userid),
  });

  if (isCancel(selected)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  return researchers.filter((r) =>
    (selected as readonly string[]).includes(r.userid),
  );
};
