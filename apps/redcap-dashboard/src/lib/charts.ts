import * as Plot from '@observablehq/plot';
import type { RollingPoint } from '@univ-lehavre/atlas-redcap-logs';

const WIDTH = 900;

// G1 — Utilisateurs actifs (stacked area: loggé / lien_personnel / anonyme)
export const usersOptions = (data: RollingPoint[]): Plot.PlotOptions => ({
  width: WIDTH,
  y: { label: 'Utilisateurs actifs (30j)' },
  x: { label: null },
  color: { legend: true },
  marks: [
    Plot.areaY(data, { x: 'date', y: 'users_logged', fill: '#3b82f6', tip: true }),
    Plot.areaY(data, {
      x: 'date',
      y: (d) => d.users_logged + d.users_link,
      fill: '#f59e0b',
    }),
    Plot.areaY(data, {
      x: 'date',
      y: (d) => d.users_logged + d.users_link + d.users_anon,
      fill: '#d1d5db',
    }),
    Plot.lineY(data, {
      x: 'date',
      y: (d) => d.users_logged + d.users_link + d.users_anon,
      stroke: '#6b7280',
      strokeWidth: 1,
    }),
  ],
});

// G2 — Projets actifs
export const projectsOptions = (data: RollingPoint[]): Plot.PlotOptions => ({
  width: WIDTH,
  y: { label: 'Projets actifs (30j)' },
  x: { label: null },
  marks: [
    Plot.areaY(data, { x: 'date', y: 'projects_active', fill: '#818cf8', opacity: 0.6 }),
    Plot.lineY(data, { x: 'date', y: 'projects_active', stroke: '#4f46e5' }),
  ],
});

// G3 — Actions totales
export const actionsOptions = (data: RollingPoint[]): Plot.PlotOptions => ({
  width: WIDTH,
  y: { label: 'Actions totales (30j)' },
  x: { label: null },
  marks: [
    Plot.areaY(data, { x: 'date', y: 'actions_total', fill: '#6ee7b7', opacity: 0.6 }),
    Plot.lineY(data, { x: 'date', y: 'actions_total', stroke: '#059669' }),
  ],
});

// G4 — Actions par catégorie (stacked area)
type ActionKey = keyof Pick<
  RollingPoint,
  | 'actions_data'
  | 'actions_survey'
  | 'actions_api'
  | 'actions_project'
  | 'actions_users'
  | 'actions_auth'
  | 'actions_other'
>;

const CATEGORY_COLORS: Record<ActionKey, string> = {
  actions_data: '#3b82f6',
  actions_survey: '#f59e0b',
  actions_api: '#8b5cf6',
  actions_project: '#10b981',
  actions_users: '#ef4444',
  actions_auth: '#f97316',
  actions_other: '#d1d5db',
};

const CATEGORY_LABELS: Record<ActionKey, string> = {
  actions_data: 'Données',
  actions_survey: 'Survey',
  actions_api: 'API',
  actions_project: 'Projet',
  actions_users: 'Utilisateurs',
  actions_auth: 'Authentification',
  actions_other: 'Autre',
};

const ACTION_KEYS: ActionKey[] = [
  'actions_data',
  'actions_survey',
  'actions_api',
  'actions_project',
  'actions_users',
  'actions_auth',
  'actions_other',
];

const stackedAreaMarks = (data: RollingPoint[]): Plot.Markish[] =>
  ACTION_KEYS.map((key, i) => {
    const keys = ACTION_KEYS.slice(0, i + 1);
    return Plot.areaY(data, {
      x: 'date',
      y: (d: RollingPoint) => keys.map((k) => d[k]).reduce((a, b) => a + b, 0),
      fill: CATEGORY_COLORS[key],
      title: CATEGORY_LABELS[key],
      opacity: 0.85,
    });
  });

export const actionCategoriesOptions = (data: RollingPoint[]): Plot.PlotOptions => ({
  width: WIDTH,
  y: { label: 'Actions (30j)' },
  x: { label: null },
  marks: [
    ...stackedAreaMarks(data),
    Plot.lineY(data, { x: 'date', y: 'actions_total', stroke: '#374151', strokeWidth: 1 }),
  ],
});
