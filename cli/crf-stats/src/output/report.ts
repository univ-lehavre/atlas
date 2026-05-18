export interface ProjectResult {
  readonly projectId: number;
  readonly status: number | null;
  readonly statusText: string;
  readonly ok: boolean;
  readonly bodyPreview: string;
  readonly error: string | null;
}

export const summarizeStatus = (
  results: readonly ProjectResult[],
): Record<string, number> =>
  results.reduce<Record<string, number>>((acc, result) => {
    const key = result.status === null ? "ERR" : String(result.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

export const printHuman = (
  results: readonly ProjectResult[],
  showBody: boolean,
): void => {
  for (const result of results) {
    if (result.status === null) {
      console.log(
        `[redcap] project ${String(result.projectId)}: ERROR ${result.error ?? "unknown"}`,
      );
      continue;
    }

    console.log(
      `[redcap] project ${String(result.projectId)}: HTTP ${String(result.status)} ${result.statusText}`,
    );

    if (showBody && result.bodyPreview !== "") {
      console.log(`  body: ${result.bodyPreview.replace(/\s+/g, " ").trim()}`);
    }
  }

  const summary = summarizeStatus(results);
  console.log("");
  console.log(`Résumé: ${JSON.stringify(summary)}`);
};
