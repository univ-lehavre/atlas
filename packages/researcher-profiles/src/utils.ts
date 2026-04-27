/**
 * Returns the number of days until the next update, or null if > 1 month ago / never imported.
 */
export const daysUntilNextUpdate = (
  importedDate: string,
  now = new Date(),
): number | null => {
  if (importedDate === "") return null;
  const importedAt = new Date(importedDate);
  if (Number.isNaN(importedAt.getTime())) return null;

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (importedAt <= oneMonthAgo) return null;

  const nextUpdate = new Date(importedAt);
  nextUpdate.setMonth(nextUpdate.getMonth() + 1);
  return Math.ceil(
    (nextUpdate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
};
