// SurveyRequestItem fixtures for level-1 tests.
//
// The UI on +page.svelte slices `data.requests` into two groups :
//   - incomplete : `validation_finale_complete !== '2'`
//   - in progress : `validation_finale_complete === '2'`
// The `#complete` and `#follow` sections render conditionally on each
// being non-empty. Fixtures below cover every combination.

import type { SurveyRequestItem } from '$lib/types/api/surveys';

const base: SurveyRequestItem = {
  record_id: '0123456789abcdef01234567',
  created_at: '2026-01-01T00:00:00Z',
  demandeur_statut: '1',
  mobilite_type: '1',
  invitation_type: '1',
  invite_nom: 'Dupont Marie',
  mobilite_universite_eunicoast: '',
  mobilite_universite_gu8: '',
  mobilite_universite_autre: 'Université de Test',
  form_complete: '2',
  avis_composante_position: '1',
  demandeur_composante_complete: '2',
  avis_laboratoire_position: '1',
  labo_complete: '2',
  avis_encadrant_position: '1',
  encadrant_complete: '2',
  validation_finale_complete: '0',
};

/** Request still in completion (validation_finale_complete !== '2'). */
const incompleteRequest = (id: string): SurveyRequestItem => ({
  ...base,
  record_id: id,
  validation_finale_complete: '0',
});

/** Request fully completed (validation_finale_complete === '2'). */
const inProgressRequest = (id: string): SurveyRequestItem => ({
  ...base,
  record_id: id,
  validation_finale_complete: '2',
});

export const noRequests: SurveyRequestItem[] = [];

export const oneIncompleteRequest: SurveyRequestItem[] = [incompleteRequest('incomplete-001')];

export const oneInProgressRequest: SurveyRequestItem[] = [inProgressRequest('progress-001')];

export const mixedRequests: SurveyRequestItem[] = [
  incompleteRequest('incomplete-001'),
  incompleteRequest('incomplete-002'),
  inProgressRequest('progress-001'),
];
