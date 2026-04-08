import type { RedcapLogEntry } from '@univ-lehavre/atlas-redcap-logs';

// Patch : exclure les logs du 7 et 8 avril 2026 (données corrompues)
const EXCLUDED: { year: number; month: number; day: number }[] = [
  { year: 2026, month: 3, day: 7 }, // mois 0-indexé : 3 = avril
  { year: 2026, month: 3, day: 8 },
];

export const applyPatches = (entries: readonly RedcapLogEntry[]): RedcapLogEntry[] =>
  entries.filter((e) => {
    const d = e.timestamp;
    return !EXCLUDED.some(
      (ex) => d.getFullYear() === ex.year && d.getMonth() === ex.month && d.getDate() === ex.day
    );
  });
