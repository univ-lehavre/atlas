// Minimal contract for the records `Request.svelte` and `Complete.svelte`
// render. Defined as a plain TypeScript interface (no zod) so this
// package doesn't pull a runtime validation dependency. Amarre's
// zod-inferred `SurveyRequestItem` is structurally assignable to this
// shape — the consumer's stricter typings always win.

export interface RequestRecord {
  record_id: string;
  created_at: string;

  demandeur_statut: string;
  invitation_type: string;
  mobilite_type: string;
  invite_nom: string;

  mobilite_universite_eunicoast: string;
  mobilite_universite_gu8: string;
  mobilite_universite_autre: string;

  form_complete: string;
  demandeur_composante_complete: string;
  labo_complete: string;
  encadrant_complete: string;
  validation_finale_complete: string;
}

export type RequestRecordList = RequestRecord[];
