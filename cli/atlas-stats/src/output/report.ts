import type { AtlasCliReport, Period } from "@univ-lehavre/atlas-stats";

const PACKAGE_SCOPE = "@univ-lehavre/";

const formatNumber = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)} M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)} k`
      : String(value);

const formatDate = (iso: string): string => {
  if (iso === "") return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${String(days)} j`;
  return `il y a ${String(Math.floor(days / 30))} mois`;
};

const pad = (value: string, width: number): string => value.padEnd(width, " ");

export const formatSummary = (report: AtlasCliReport, period: Period): string =>
  [
    `Releases GitHub (${period}) : ${String(report.summary.githubReleasesForPeriod)}`,
    `Releases GitHub (API total) : ${String(report.summary.githubReleasesApiTotal)}`,
    `Releases GitHub (mappées)   : ${String(report.summary.githubReleasesMappedTotal)}`,
    `Releases npm (total)        : ${report.summary.npmReleasesTotalLabel}`,
    `Paquets (${period})         : ${String(report.summary.packagesTotal)} total, ${String(report.summary.packagesActive)} actif(s)`,
    `Downloads : ${formatNumber(report.summary.downloadsTotal)}`,
  ].join("\n");

export const formatTable = (report: AtlasCliReport): string => {
  const COL_NAME = 32;
  const COL_VER = 10;
  const COL_NPM = 6;
  const COL_GH = 9;
  const COL_NPM_RELEASES = 10;
  const COL_GH_RELEASES = 9;
  const COL_MONO = 10;
  const COL_DATE = 18;
  const COL_DL = 12;

  const header =
    pad("Paquet", COL_NAME) +
    pad("Version", COL_VER) +
    pad("npm", COL_NPM) +
    pad("GitHub", COL_GH) +
    pad("Rel npm", COL_NPM_RELEASES) +
    pad("Rel GH", COL_GH_RELEASES) +
    pad("Monorepo", COL_MONO) +
    pad("Dernière pub.", COL_DATE) +
    "Téléchargements".padStart(COL_DL);

  const totalWidth =
    COL_NAME +
    COL_VER +
    COL_NPM +
    COL_GH +
    COL_NPM_RELEASES +
    COL_GH_RELEASES +
    COL_MONO +
    COL_DATE +
    COL_DL;
  const separator = "─".repeat(totalWidth);

  const rows = report.rows.map(
    (row) =>
      pad(row.packageName.replace(PACKAGE_SCOPE, ""), COL_NAME) +
      pad(row.version, COL_VER) +
      pad(row.npmPresent ? "oui" : "non", COL_NPM) +
      pad(row.ghPresent ? "oui" : "non", COL_GH) +
      pad(
        row.npmReleaseCount === null ? "?" : String(row.npmReleaseCount),
        COL_NPM_RELEASES,
      ) +
      pad(String(row.ghReleaseCount), COL_GH_RELEASES) +
      pad(row.monorepoPresent ? "oui" : "non", COL_MONO) +
      pad(formatDate(row.lastPublishedAt), COL_DATE) +
      formatNumber(row.totalDownloads).padStart(COL_DL),
  );

  const tableRows: string[] = [];
  tableRows.push(...rows.slice(0, report.splitIndex));
  if (report.splitIndex > 0 && report.splitIndex < rows.length) {
    const label = " ABSENTS DU MONOREPO ";
    const left = Math.max(0, Math.floor((totalWidth - label.length) / 2));
    const right = Math.max(0, totalWidth - label.length - left);
    tableRows.push("─".repeat(left) + label + "─".repeat(right));
  }
  tableRows.push(...rows.slice(report.splitIndex));
  tableRows.push(separator);
  tableRows.push(
    pad("TOTAL", COL_NAME) +
      pad("—", COL_VER) +
      pad("—", COL_NPM) +
      pad("—", COL_GH) +
      pad(report.totals.npmReleasesLabel, COL_NPM_RELEASES) +
      pad(String(report.totals.ghReleasesTotal), COL_GH_RELEASES) +
      pad("—", COL_MONO) +
      pad("—", COL_DATE) +
      formatNumber(report.totals.downloadsTotal).padStart(COL_DL),
  );

  return [header, separator, ...tableRows].join("\n");
};
