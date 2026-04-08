import type {
  Granularity,
  LogActionCategory,
  MonthlyPoint,
  RedcapLogEntry,
} from "./types.js";
import { countDistinctSurveyed } from "./surveyed.js";

const countOf = (
  entries: readonly RedcapLogEntry[],
  cat: LogActionCategory,
): number => entries.filter((e) => e.action_category === cat).length;

const computePoint = (
  date: Date,
  entries: readonly RedcapLogEntry[],
): MonthlyPoint => {
  const loggedUsers = new Set(
    entries
      .filter((entry) => entry.user_type === "loggé")
      .map((entry) => entry.username),
  );
  const surveyedUsers = countDistinctSurveyed(entries);
  const projectIds = new Set(entries.map((entry) => entry.project_id));

  return {
    date,
    users_total: loggedUsers.size + surveyedUsers,
    users_logged: loggedUsers.size,
    users_surveyed: surveyedUsers,
    projects_active: projectIds.size,
    actions_total: entries.length,
    actions_surveyed_user: entries.filter(
      (entry) => entry.user_type === "enquêté",
    ).length,
    actions_records: countOf(entries, "Enregistrements"),
    actions_surveys: countOf(entries, "Questionnaires"),
    actions_files: countOf(entries, "Fichiers"),
    actions_project: countOf(entries, "Projet"),
    actions_users: countOf(entries, "Utilisateurs"),
    actions_api: countOf(entries, "API"),
    actions_auth: countOf(entries, "Authentification"),
    actions_other: countOf(entries, "Autre"),
  };
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

const isoMonday = (date: Date): Date => {
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
};

const bucketKey = (granularity: Granularity, date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const keys: Record<Granularity, string> = {
    day: `${String(y)}-${pad2(m + 1)}-${pad2(d)}`,
    week: (() => {
      const mon = isoMonday(date);
      return `${String(mon.getFullYear())}-${pad2(mon.getMonth() + 1)}-${pad2(mon.getDate())}`;
    })(),
    month: `${String(y)}-${pad2(m)}`,
    quarter: `${String(y)}-Q${String(Math.floor(m / 3) + 1)}`,
  };
  return keys[granularity];
};

const bucketDate = (granularity: Granularity, key: string): Date => {
  const dates: Record<Granularity, Date> = {
    day: new Date(key),
    week: new Date(key),
    quarter: (() => {
      const parts = key.split("-");
      const q = Number((parts[1] ?? "Q1").slice(1));
      return new Date(Number(parts[0]), (q - 1) * 3, 1);
    })(),
    month: (() => {
      const parts = key.split("-");
      return new Date(Number(parts[0]), Number(parts[1]), 1);
    })(),
  };
  return dates[granularity];
};

export const computeCalendar = (
  granularity: Granularity,
  entries: readonly RedcapLogEntry[],
): MonthlyPoint[] => {
  const byBucket = Object.groupBy(entries, (entry) =>
    bucketKey(granularity, entry.timestamp),
  );

  return Object.entries(byBucket)
    .flatMap(([key, bucketEntries]) =>
      bucketEntries === undefined
        ? []
        : [
            computePoint(
              bucketDate(granularity, key),
              bucketEntries.toSorted(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
              ),
            ),
          ],
    )
    .toSorted((a, b) => a.date.getTime() - b.date.getTime());
};

export const computeMonthlyCalendar = (
  entries: readonly RedcapLogEntry[],
): MonthlyPoint[] => computeCalendar("month", entries);
