import type {
  LogActionCategory,
  MonthlyPoint,
  RedcapLogEntry,
} from "./types.js";
import { countDistinctSurveyed } from "./surveyed.js";

const monthKey = (date: Date): string =>
  `${String(date.getFullYear())}-${String(date.getMonth()).padStart(2, "0")}`;

const countOf = (
  entries: readonly RedcapLogEntry[],
  cat: LogActionCategory,
): number => entries.filter((e) => e.action_category === cat).length;

const computeMonthlyPoint = (
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

export const computeMonthlyCalendar = (
  entries: readonly RedcapLogEntry[],
): MonthlyPoint[] => {
  const byMonth = Object.groupBy(entries, (entry) => monthKey(entry.timestamp));

  return Object.entries(byMonth)
    .flatMap(([key, monthEntries]) => {
      const parts = key.split("-");
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      return monthEntries === undefined
        ? []
        : [
            computeMonthlyPoint(
              new Date(year, month, 1),
              monthEntries.toSorted(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
              ),
            ),
          ];
    })
    .toSorted((a, b) => a.date.getTime() - b.date.getTime());
};
