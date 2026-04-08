import type {
  LogActionCategory,
  RedcapLogEntry,
  RollingPoint,
} from "./types.js";
import { countDistinctSurveyed } from "./surveyed.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * MS_PER_DAY;

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const countOf = (
  window: readonly RedcapLogEntry[],
  cat: LogActionCategory,
): number => window.filter((e) => e.action_category === cat).length;

const countCategories = (
  window: readonly RedcapLogEntry[],
): Pick<
  RollingPoint,
  | "actions_records"
  | "actions_surveys"
  | "actions_files"
  | "actions_project"
  | "actions_users"
  | "actions_api"
  | "actions_auth"
  | "actions_other"
> => ({
  actions_records: countOf(window, "Enregistrements"),
  actions_surveys: countOf(window, "Questionnaires"),
  actions_files: countOf(window, "Fichiers"),
  actions_project: countOf(window, "Projet"),
  actions_users: countOf(window, "Utilisateurs"),
  actions_api: countOf(window, "API"),
  actions_auth: countOf(window, "Authentification"),
  actions_other: countOf(window, "Autre"),
});

const countUsers = (
  window: readonly RedcapLogEntry[],
): Pick<RollingPoint, "users_total" | "users_logged" | "users_surveyed"> => {
  const loggedUsers = new Set(
    window
      .filter((entry) => entry.user_type === "loggé")
      .map((entry) => entry.username),
  );
  const surveyedUsers = countDistinctSurveyed(window);

  return {
    users_total: loggedUsers.size + surveyedUsers,
    users_logged: loggedUsers.size,
    users_surveyed: surveyedUsers,
  };
};

const computePoint = (
  date: Date,
  entries: readonly RedcapLogEntry[],
): RollingPoint => {
  const from = date.getTime() - MS_30_DAYS;
  const to = date.getTime();
  const window = entries.filter(
    (e) => e.timestamp.getTime() > from && e.timestamp.getTime() <= to,
  );
  const projectIds = new Set(window.map((e) => e.project_id));

  return {
    date: new Date(date),
    ...countUsers(window),
    projects_active: projectIds.size,
    actions_total: window.length,
    actions_surveyed_user: window.filter(
      (entry) => entry.user_type === "enquêté",
    ).length,
    ...countCategories(window),
  };
};

export const computeRollingWindow = (
  entries: readonly RedcapLogEntry[],
): RollingPoint[] => {
  const sorted = [...entries].toSorted(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const first = sorted[0];
  const last = sorted.at(-1);

  return first === undefined || last === undefined
    ? []
    : Array.from(
        {
          length:
            Math.ceil(
              (startOfDay(last.timestamp).getTime() -
                addDays(startOfDay(first.timestamp), 30).getTime()) /
                MS_PER_DAY,
            ) + 1,
        },
        (_, i) =>
          computePoint(
            addDays(addDays(startOfDay(first.timestamp), 30), i),
            sorted,
          ),
      );
};
