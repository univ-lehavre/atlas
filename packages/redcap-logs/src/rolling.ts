import type {
  LogActionCategory,
  RedcapLogEntry,
  RollingPoint,
} from "./types.js";

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
  | "actions_data"
  | "actions_survey"
  | "actions_api"
  | "actions_project"
  | "actions_users"
  | "actions_auth"
  | "actions_other"
> => ({
  actions_data: countOf(window, "Données"),
  actions_survey: countOf(window, "Survey"),
  actions_api: countOf(window, "API"),
  actions_project: countOf(window, "Projet"),
  actions_users: countOf(window, "Utilisateurs"),
  actions_auth: countOf(window, "Authentification"),
  actions_other: countOf(window, "Autre"),
});

const countUsers = (
  window: readonly RedcapLogEntry[],
): Pick<
  RollingPoint,
  "users_total" | "users_logged" | "users_link" | "users_anon"
> => {
  const uniqueTypes = [
    ...new Map(
      window.map((e) => [`${e.username}|${e.user_type}`, e.user_type]),
    ).values(),
  ];
  return {
    users_total: uniqueTypes.length,
    users_logged: uniqueTypes.filter((t) => t === "loggé").length,
    users_link: uniqueTypes.filter((t) => t === "lien_personnel").length,
    users_anon: uniqueTypes.filter((t) => t === "anonyme").length,
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
