import type { Meta, StoryObj } from "@storybook/sveltekit";
import Request from "./Request.svelte";
import type { RequestRecord } from "./types/request";

const invitationRequest: RequestRecord = {
  record_id: "req-invitation-001",
  created_at: "2026-02-14T09:30:00Z",
  demandeur_statut: "1",
  invitation_type: "1",
  mobilite_type: "1",
  invite_nom: "Pr. Watanabe Yuki",
  mobilite_universite_eunicoast: "",
  mobilite_universite_gu8: "Université de Tsukuba",
  mobilite_universite_autre: "",
  form_complete: "2",
  demandeur_composante_complete: "2",
  labo_complete: "0",
  encadrant_complete: "0",
  validation_finale_complete: "0",
};

const voyageRequest: RequestRecord = {
  record_id: "req-voyage-002",
  created_at: "2026-03-02T11:00:00Z",
  demandeur_statut: "3",
  invitation_type: "",
  mobilite_type: "2",
  invite_nom: "",
  mobilite_universite_eunicoast: "Université de La Corogne",
  mobilite_universite_gu8: "",
  mobilite_universite_autre: "",
  form_complete: "2",
  demandeur_composante_complete: "0",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale_complete: "2",
};

const meta = {
  title: "amarre/Request",
  component: Request,
} satisfies Meta<typeof Request>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InvitationAwaitingLabo: Story = {
  args: { request: invitationRequest },
};
export const VoyageFullyValidated: Story = { args: { request: voyageRequest } };
