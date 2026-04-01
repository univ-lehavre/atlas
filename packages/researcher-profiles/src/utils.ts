/**
 * Returns the number of days until the next update, or null if > 1 month ago / never imported.
 */
export const daysUntilNextUpdate = (importedDate: string): number | null => {
  if (importedDate === "") return null;
  const importedAt = new Date(importedDate);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (importedAt <= oneMonthAgo) return null;
  const nextUpdate = new Date(importedAt);
  nextUpdate.setMonth(nextUpdate.getMonth() + 1);
  return Math.ceil((nextUpdate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};
