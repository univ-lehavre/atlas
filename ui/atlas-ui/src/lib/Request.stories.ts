import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Request from "./Request.svelte";
import type { RequestRecord } from "./types/request";

// `Request.svelte` branches on a dozen derived flags. Every story below
// is built from this base and changes just enough to isolate one
// rendering path (title, signature rows, link availability, final
// validation banner). See the JSDoc on each story for what's being
// exercised.
const base: RequestRecord = {
  record_id: "req-base",
  created_at: "2026-03-14T10:00:00Z",
  demandeur_statut: "1", // étudiant
  invitation_type: "1",
  mobilite_type: "1",
  invite_nom: "",
  mobilite_universite_eunicoast: "",
  mobilite_universite_gu8: "",
  mobilite_universite_autre: "",
  form_complete: "2",
  demandeur_composante_complete: "0",
  labo_complete: "0",
  encadrant_complete: "0",
  validation_finale_complete: "0",
};

// --- Pre-form (no flow chosen yet) ---

const blankDraft: RequestRecord = {
  ...base,
  record_id: "req-draft",
  form_complete: "0",
  invitation_type: "",
  mobilite_type: "",
  form: "https://example.com/forms/req-draft",
};

// --- Invitation flow (someone visiting Le Havre) ---

const invitationFormInProgress: RequestRecord = {
  ...base,
  record_id: "req-inv-form",
  invite_nom: "Personne Fictive 1",
  invitation_type: "2", // → composanteShouldSign
  mobilite_universite_gu8: "Université Fictive Alpha",
  form_complete: "0",
  form: "https://example.com/forms/req-inv-form",
};

const invitationAwaitingComposante: RequestRecord = {
  ...base,
  record_id: "req-inv-await-composante",
  invite_nom: "Personne Fictive 1",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
};

const invitationComposanteSigned: RequestRecord = {
  ...invitationAwaitingComposante,
  record_id: "req-inv-composante-ok",
  demandeur_composante_complete: "2",
  validation_finale: "https://example.com/forms/req-inv-final",
};

const invitationFullyValidated: RequestRecord = {
  ...invitationAwaitingComposante,
  record_id: "req-inv-full",
  demandeur_composante_complete: "2",
  labo_complete: "2",
  validation_finale_complete: "2",
};

// --- Voyage flow (someone going abroad) ---

const voyageEtudiantAwaiting: RequestRecord = {
  ...base,
  record_id: "req-voyage-etu",
  mobilite_type: "2", // → laboShouldSign for student
  mobilite_universite_eunicoast: "Université Fictive Bravo",
};

const voyageOtherFullCircuit: RequestRecord = {
  ...base,
  record_id: "req-voyage-other",
  demandeur_statut: "3", // categoryOther → encadrantShouldSign + laboShouldSign
  mobilite_type: "2",
  invitation_type: "",
  mobilite_universite_autre: "Université Fictive Charlie",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale: "https://example.com/forms/req-voyage-other-final",
};

const voyageFullyValidated: RequestRecord = {
  ...voyageOtherFullCircuit,
  record_id: "req-voyage-full",
  validation_finale_complete: "2",
};

// --- Special : enseignant inviting ---

const enseignantInvitation: RequestRecord = {
  ...base,
  record_id: "req-enseignant",
  demandeur_statut: "2", // enseignant → composanteShouldSign for any invitation
  invite_nom: "Personne Fictive 2",
  mobilite_universite_autre: "Université Fictive Delta",
  invitation_type: "1",
  demandeur_composante_complete: "2",
};

const meta = {
  title: "amarre/Request",
  component: Request,
  parameters: {
    docs: {
      description: {
        component:
          "Per-request card. Branches on a dozen derived flags : `invite_nom` (invitation/voyage/new title), `demandeur_statut` + `invitation_type` + `mobilite_type` (which signatures matter), and per-actor `*_complete === '2'` (whether each is done). Each row's colour bands the progress : warning (form unfilled), info (waiting), success (signed/validated). The trailing card-links (`Formulaire` + `Validation finale`) toggle between download / resume-edit / disabled.",
      },
    },
  },
} satisfies Meta<typeof Request>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---- Pre-form ----

/** Blank draft — `form_complete='0'`, no invite_nom, no destination.
 * Title falls back to "Ma nouvelle demande" (third branch). All
 * signature rows hidden (no should-sign flag), every other row is
 * warning. Formulaire link points at the resume-edit URL. */
export const BlankDraft: Story = {
  args: { request: blankDraft },
};

// ---- Invitation flow ----

/** Invitation, form still being filled. All progress rows yellow ;
 * Formulaire link points at the in-progress edit URL. */
export const InvitationFormInProgress: Story = {
  args: { request: invitationFormInProgress },
};

/** Invitation, form done, composante hasn't signed yet (info row
 * "se concerte"). PDF download link active for Formulaire ;
 * Validation finale shown disabled. */
export const InvitationAwaitingComposante: Story = {
  args: { request: invitationAwaitingComposante },
};

/** Invitation, composante signed (green row) ; final validation
 * available — Validation finale link active. */
export const InvitationReadyForFinal: Story = {
  args: { request: invitationComposanteSigned },
};

/** Invitation, every signature collected + final validation done.
 * All rows green ; Validation finale link hidden (already done). */
export const InvitationFullyValidated: Story = {
  args: { request: invitationFullyValidated },
};

// ---- Voyage flow ----

/** Voyage by an étudiant — labo must sign (mobilite_type=2 trigger).
 * Composante & encadrant rows hidden. */
export const VoyageEtudiantAwaitingLabo: Story = {
  args: { request: voyageEtudiantAwaiting },
};

/** Voyage by a categoryOther — both labo and encadrant must sign ;
 * both signed, awaiting final. Validation finale link active. */
export const VoyageReadyForFinal: Story = {
  args: { request: voyageOtherFullCircuit },
};

/** Voyage fully validated (every row green). */
export const VoyageFullyValidated: Story = {
  args: { request: voyageFullyValidated },
};

// ---- Edge case ----

/** Enseignant inviting : composanteShouldSign fires for any invitation
 * type (not just 2/3), because `isCategoryEnseignant` short-circuits.
 * Composante already signed, demonstrates the "demandeur_statut=2"
 * code-path. */
export const EnseignantInvitation: Story = {
  args: { request: enseignantInvitation },
};
