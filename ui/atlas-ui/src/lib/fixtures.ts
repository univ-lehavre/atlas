// Local fixtures used by the stories. Kept here as plain TS so :
//   - stories don't reach into amarre's tests (cross-app coupling) ;
//   - the next PR can promote amarre's `tests/fixtures/{requests,forms}.ts`
//     here and tests + stories will both consume them from one place.

import type { RequestRecord, RequestRecordList } from "./types/request";

const baseRequest: RequestRecord = {
  record_id: "0123456789abcdef01234567",
  created_at: "2026-01-01T00:00:00Z",
  demandeur_statut: "1",
  mobilite_type: "1",
  invitation_type: "1",
  invite_nom: "Dupont Marie",
  mobilite_universite_eunicoast: "",
  mobilite_universite_gu8: "",
  mobilite_universite_autre: "Université de Test",
  form_complete: "2",
  demandeur_composante_complete: "2",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale_complete: "0",
};

export const noRequests: RequestRecordList = [];

export const oneIncompleteRequest: RequestRecordList = [
  {
    ...baseRequest,
    record_id: "incomplete-001",
    validation_finale_complete: "0",
  },
];

export const oneInProgressRequest: RequestRecordList = [
  {
    ...baseRequest,
    record_id: "progress-001",
    validation_finale_complete: "2",
  },
];

export const mixedRequests: RequestRecordList = [
  ...oneIncompleteRequest,
  ...oneInProgressRequest,
];

export const signupSuccess = {
  data: { signedUp: true, createdAt: "2026-01-01T00:00:00.000Z" },
};

export const signupWrongEmail = {
  wrongSignupEmail: true,
  code: "invalid_email",
  message: "Email invalide",
};

export const signupRateLimited = {
  wrongSignupEmail: true,
  code: "rate_limited",
  message: "Trop de tentatives",
};
