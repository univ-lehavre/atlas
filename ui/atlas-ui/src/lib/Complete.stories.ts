import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Complete from "./Complete.svelte";
import type { RequestRecord, RequestRecordList } from "./types/request";

// Complete renders `<Request>` cards for every record passed in. The
// variants below cover : empty (no section in amarre's page), single
// record at various stages, and many records to show the horizontal
// scroller's overflow behaviour. All records here have
// `validation_finale_complete !== '2'` — that's amarre's filter for
// which list this is.

const base: RequestRecord = {
  record_id: "fake-base",
  created_at: "2026-02-20T08:00:00Z",
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

const formInProgress: RequestRecord = {
  ...base,
  record_id: "fake-form-in-progress",
  form_complete: "0",
  form: "https://example.com/forms/fake-form-in-progress",
};

const invitationAwaitingComposante: RequestRecord = {
  ...base,
  record_id: "fake-invitation-await",
  invite_nom: "Personne Fictive A",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
};

const invitationReadyForFinal: RequestRecord = {
  ...invitationAwaitingComposante,
  record_id: "fake-invitation-ready",
  demandeur_composante_complete: "2",
  validation_finale: "https://example.com/forms/fake-invitation-ready-final",
};

const voyageAwaitingLabo: RequestRecord = {
  ...base,
  record_id: "fake-voyage-await",
  mobilite_type: "2",
  mobilite_universite_eunicoast: "Université Fictive Bravo",
};

const voyageReadyForFinal: RequestRecord = {
  ...base,
  record_id: "fake-voyage-ready",
  demandeur_statut: "3",
  mobilite_type: "2",
  invitation_type: "",
  mobilite_universite_autre: "Université Fictive Charlie",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale: "https://example.com/forms/fake-voyage-ready-final",
};

const many: RequestRecordList = [
  formInProgress,
  invitationAwaitingComposante,
  invitationReadyForFinal,
  voyageAwaitingLabo,
  voyageReadyForFinal,
  { ...invitationAwaitingComposante, record_id: "fake-overflow-1" },
  { ...voyageAwaitingLabo, record_id: "fake-overflow-2" },
];

const meta = {
  title: "amarre/Sections/Complete",
  component: Complete,
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal scroller of requests in "to complete" state (`validation_finale_complete !== "2"`). Renders a `<Request>` card per record — see Request stories for the per-card states. amarre filters upstream, so this list never carries fully-validated requests.',
      },
    },
  },
} satisfies Meta<typeof Complete>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No requests — amarre hides the whole section in this case (the
 * `<Complete>` block is wrapped by `{#if hasIncompleteRequests}` in the
 * page). Shown here for completeness ; the SectionTile + scroller chrome
 * still render. */
export const Empty: Story = { args: { requests: [] } };

/** One record, form still being filled. Yellow rows throughout. */
export const OneFormInProgress: Story = {
  args: { requests: [formInProgress] },
};

/** One invitation, form done, waiting for composante's signature. */
export const OneInvitationAwaitingComposante: Story = {
  args: { requests: [invitationAwaitingComposante] },
};

/** One invitation, ready for the user's final validation step. */
export const OneInvitationReadyForFinal: Story = {
  args: { requests: [invitationReadyForFinal] },
};

/** One voyage by an étudiant — labo signature pending. */
export const OneVoyageAwaitingLabo: Story = {
  args: { requests: [voyageAwaitingLabo] },
};

/** One voyage by an autre statut — encadrant + labo signed,
 * final validation step now available. */
export const OneVoyageReadyForFinal: Story = {
  args: { requests: [voyageReadyForFinal] },
};

/** Three cards : invitation at three different progress stages
 * — eye-balls the side-by-side color progression. */
export const ThreeMixed: Story = {
  args: {
    requests: [
      formInProgress,
      invitationAwaitingComposante,
      invitationReadyForFinal,
    ],
  },
};

/** Seven cards : exercise the horizontal scroller's overflow + snap. */
export const Many: Story = { args: { requests: many } };
