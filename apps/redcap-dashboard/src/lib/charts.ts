import * as Plot from '@observablehq/plot';
import type { MonthlyPoint } from '@univ-lehavre/atlas-redcap-logs';

const WIDTH = 900;
export type YScaleMode = 'linear' | 'log';
const yScale = (mode: YScaleMode): Plot.ScaleOptions =>
  mode === 'log' ? { type: 'symlog' } : { type: 'linear' };

// SvelteKit serializes Date to ISO strings — rehydrate before passing to Plot
export type SerializedPoint = Omit<MonthlyPoint, 'date'> & { date: string | Date };
const rehydrate = (data: SerializedPoint[]): MonthlyPoint[] =>
  data.map((p) => ({ ...p, date: new Date(p.date) }));

// G1 — Utilisateurs loggés (évolution)
export const loggedUsersOptions = (
  data: SerializedPoint[],
  mode: YScaleMode = 'linear'
): Plot.PlotOptions => {
  const d = rehydrate(data);
  return {
    width: WIDTH,
    y: { label: 'Utilisateurs loggés (mensuel)', ...yScale(mode) },
    x: { label: null },
    marks: [Plot.barY(d, { x: 'date', y: 'users_logged', fill: '#0072B2', tip: true })],
  };
};

// G2 — Projets actifs
export const projectsOptions = (
  data: SerializedPoint[],
  mode: YScaleMode = 'linear'
): Plot.PlotOptions => {
  const d = rehydrate(data);
  return {
    width: WIDTH,
    y: { label: 'Projets actifs (mensuel)', ...yScale(mode) },
    x: { label: null },
    marks: [Plot.barY(d, { x: 'date', y: 'projects_active', fill: '#56B4E9', tip: true })],
  };
};

// G3 — Actions totales
export const actionsOptions = (
  data: SerializedPoint[],
  mode: YScaleMode = 'linear'
): Plot.PlotOptions => {
  const d = rehydrate(data);
  return {
    width: WIDTH,
    y: { label: 'Actions totales (mensuel)', ...yScale(mode) },
    x: { label: null },
    marks: [Plot.barY(d, { x: 'date', y: 'actions_total', fill: '#6ee7b7', tip: true })],
  };
};

// G4 — Actions par catégorie
type ActionKey = keyof Pick<
  MonthlyPoint,
  | 'actions_records'
  | 'actions_surveys'
  | 'actions_files'
  | 'actions_project'
  | 'actions_users'
  | 'actions_api'
  | 'actions_auth'
  | 'actions_other'
>;

const CATEGORY_COLORS: Record<ActionKey, string> = {
  actions_records: '#0072B2',
  actions_surveys: '#E69F00',
  actions_files: '#009E73',
  actions_project: '#56B4E9',
  actions_users: '#CC79A7',
  actions_api: '#D55E00',
  actions_auth: '#F0E442',
  actions_other: '#9CA3AF',
};

const CATEGORY_LABELS: Record<ActionKey, string> = {
  actions_records: 'Enregistrements',
  actions_surveys: 'Questionnaires',
  actions_files: 'Fichiers',
  actions_project: 'Projet',
  actions_users: 'Utilisateurs',
  actions_api: 'API',
  actions_auth: 'Authentification',
  actions_other: 'Autre',
};

const ACTION_KEYS: ActionKey[] = [
  'actions_records',
  'actions_surveys',
  'actions_files',
  'actions_project',
  'actions_users',
  'actions_api',
  'actions_auth',
  'actions_other',
];

type ActionBarDatum = { date: Date; category: string; value: number };
const toActionBars = (data: MonthlyPoint[]): ActionBarDatum[] =>
  data.flatMap((p) =>
    ACTION_KEYS.map((key) => ({
      date: p.date,
      category: CATEGORY_LABELS[key],
      value: p[key],
    }))
  );

export const actionCategoriesOptions = (
  data: SerializedPoint[],
  mode: YScaleMode = 'linear'
): Plot.PlotOptions => {
  const d = rehydrate(data);
  const actionBars = toActionBars(d);
  return {
    width: WIDTH,
    y: { label: 'Actions (mensuel)', ...yScale(mode) },
    x: { label: null },
    color: {
      legend: true,
      domain: ACTION_KEYS.map((key) => CATEGORY_LABELS[key]),
      range: ACTION_KEYS.map((key) => CATEGORY_COLORS[key]),
    },
    marks: [Plot.barY(actionBars, { x: 'date', y: 'value', fill: 'category', tip: true })],
  };
};
