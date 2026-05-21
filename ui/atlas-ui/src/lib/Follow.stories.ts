import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Follow from "./Follow.svelte";
import type { RequestRecord, RequestRecordList } from "./types/request";

// Follow displays the requests where `validation_finale_complete === '2'`
// — i.e. fully completed circuits, kept for follow-up / archival. All
// records below have that flag set.

const base: RequestRecord = {
  record_id: "fake-base",
  created_at: "2026-01-10T08:00:00Z",
  demandeur_statut: "1",
  invitation_type: "1",
  mobilite_type: "1",
  invite_nom: "",
  mobilite_universite_eunicoast: "",
  mobilite_universite_gu8: "",
  mobilite_universite_autre: "",
  form_complete: "2",
  demandeur_composante_complete: "2",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale_complete: "2",
};

const invitationDone: RequestRecord = {
  ...base,
  record_id: "fake-invitation-done",
  invite_nom: "Personne Fictive A",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
};

const voyageEtudiantDone: RequestRecord = {
  ...base,
  record_id: "fake-voyage-etu-done",
  mobilite_type: "2",
  mobilite_universite_eunicoast: "Université Fictive Bravo",
};

const voyageOtherDone: RequestRecord = {
  ...base,
  record_id: "fake-voyage-other-done",
  demandeur_statut: "3",
  mobilite_type: "2",
  invitation_type: "",
  mobilite_universite_autre: "Université Fictive Charlie",
};

const enseignantInvitationDone: RequestRecord = {
  ...base,
  record_id: "fake-enseignant-done",
  demandeur_statut: "2",
  invite_nom: "Personne Fictive B",
  invitation_type: "1",
  mobilite_universite_autre: "Université Fictive Delta",
};

const many: RequestRecordList = [
  invitationDone,
  voyageEtudiantDone,
  voyageOtherDone,
  enseignantInvitationDone,
  { ...invitationDone, record_id: "fake-overflow-1" },
  { ...voyageOtherDone, record_id: "fake-overflow-2" },
  { ...voyageEtudiantDone, record_id: "fake-overflow-3" },
];

const meta = {
  title: "amarre/Follow",
  component: Follow,
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal scroller of requests at "follow-up" state (`validation_finale_complete === "2"`). Cards show the full green progress with the download-PDF link active. amarre filters upstream so this list only ever holds completed circuits.',
      },
    },
  },
} satisfies Meta<typeof Follow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No requests — amarre wraps the section in `{#if hasRequestsInProgress}`,
 * so this state isn't visible in production. Kept for completeness. */
export const Empty: Story = { args: { requests: [] } };

/** One invitation, fully validated. */
export const OneInvitation: Story = { args: { requests: [invitationDone] } };

/** One voyage by an étudiant, fully validated. */
export const OneVoyageEtudiant: Story = {
  args: { requests: [voyageEtudiantDone] },
};

/** One voyage by an autre statut, fully validated. */
export const OneVoyageOther: Story = {
  args: { requests: [voyageOtherDone] },
};

/** One enseignant inviting, fully validated. */
export const OneEnseignantInvitation: Story = {
  args: { requests: [enseignantInvitationDone] },
};

/** Three flows side-by-side — visual diff between invitation, voyage
 * étudiant and voyage other in completed state. */
export const ThreeFlows: Story = {
  args: { requests: [invitationDone, voyageEtudiantDone, voyageOtherDone] },
};

/** Seven cards : exercise scroller overflow + snap on a long history. */
export const Many: Story = { args: { requests: many } };
