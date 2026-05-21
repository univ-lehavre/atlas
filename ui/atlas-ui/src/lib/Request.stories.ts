import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Request from "./Request.svelte";
import type { RequestRecord } from "./types/request";

// Base used to make each story differ only by the conditional branches
// the component derives. See `Request.svelte` for the rules.
const base: RequestRecord = {
  record_id: "req-base",
  created_at: "2026-03-14T10:00:00Z",
  demandeur_statut: "1",
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

const invitationPending: RequestRecord = {
  ...base,
  record_id: "req-invitation-pending",
  invite_nom: "Pr. Watanabe Yuki",
  mobilite_universite_gu8: "Université de Tsukuba",
  invitation_type: "2", // → composanteShouldSign
};

const invitationComposanteSigned: RequestRecord = {
  ...invitationPending,
  record_id: "req-invitation-composante-ok",
  demandeur_composante_complete: "2",
};

const invitationFullyValidated: RequestRecord = {
  ...invitationPending,
  record_id: "req-invitation-full",
  demandeur_composante_complete: "2",
  labo_complete: "2",
  validation_finale_complete: "2",
};

const voyageInProgress: RequestRecord = {
  ...base,
  record_id: "req-voyage",
  demandeur_statut: "3", // categoryOther
  mobilite_type: "2",
  invitation_type: "",
  mobilite_universite_eunicoast: "Université de La Corogne",
  labo_complete: "2",
  encadrant_complete: "2",
};

const voyageFullyValidated: RequestRecord = {
  ...voyageInProgress,
  record_id: "req-voyage-full",
  validation_finale_complete: "2",
};

const enseignantInvitation: RequestRecord = {
  ...base,
  record_id: "req-enseignant",
  demandeur_statut: "2", // enseignant → composanteShouldSign even without invitation_type 2/3
  invite_nom: "Dr. Smith John",
  mobilite_universite_autre: "Boston University",
  invitation_type: "1",
};

const meta = {
  title: "amarre/Request",
  component: Request,
  parameters: {
    docs: {
      description: {
        component:
          "Per-request card. Rendered logic flags branch on : `invite_nom` (invitation vs voyage), `demandeur_statut` (1=etudiant, 2=enseignant, 3+=other), `invitation_type` and `mobilite_type` (which signatures are required), and per-actor `*_complete === '2'` (whether that signature is done).",
      },
    },
  },
} satisfies Meta<typeof Request>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Invitation flow, awaiting composante signature. */
export const InvitationAwaitingComposante: Story = {
  args: { request: invitationPending },
};

/** Invitation flow, composante signed, awaiting next signature. */
export const InvitationPartial: Story = {
  args: { request: invitationComposanteSigned },
};

/** Invitation flow, all signatures collected + final validation. */
export const InvitationFullyValidated: Story = {
  args: { request: invitationFullyValidated },
};

/** Voyage (outgoing) flow, encadrant + labo signed, final pending. */
export const VoyageAwaitingFinal: Story = {
  args: { request: voyageInProgress },
};

/** Voyage flow, fully validated. */
export const VoyageFullyValidated: Story = {
  args: { request: voyageFullyValidated },
};

/** Enseignant inviting : composanteShouldSign even without invitation_type 2/3. */
export const EnseignantInvitation: Story = {
  args: { request: enseignantInvitation },
};
