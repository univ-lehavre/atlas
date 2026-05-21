import type { Meta, StoryObj } from "@storybook/svelte-vite";
import AmarreHomePage from "./AmarreHomePage.svelte";
import type { RequestRecord, RequestRecordList } from "./types/request";

// Page composition mirroring `apps/amarre/src/routes/+page.svelte`.
// Each variant simulates a user state amarre's load function could
// produce. Fixtures use the same fake names as the other stories.

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

const invitationAwaiting: RequestRecord = {
  ...base,
  record_id: "fake-invitation-await",
  invite_nom: "Personne Fictive A",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
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
  validation_finale: "https://example.com/forms/fake-voyage-final",
};

const fullyValidated: RequestRecord = {
  ...base,
  record_id: "fake-validated",
  invite_nom: "Personne Fictive B",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
  demandeur_composante_complete: "2",
  labo_complete: "2",
  validation_finale_complete: "2",
};

const allStates: RequestRecordList = [
  invitationAwaiting,
  voyageReadyForFinal,
  fullyValidated,
];

const RGPD_URL = "https://example.com/rgpd-notice";
const DOWNLOAD_URL = "/api/v1/surveys/download";

const meta = {
  title: "amarre/Pages/HomePage",
  component: AmarreHomePage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full composition of amarre's home page : MainTitle → TopNavbar → Collaborate → Complete (if any) → Follow (if any) → Administrate → Footer. Mirrors `apps/amarre/src/routes/+page.svelte` ; the consumer app wires the real `data` (from the load function) + SvelteKit `$env`/`$app/paths` URLs to the same props. Use this story to eyeball the *whole* page in one frame.",
      },
    },
  },
} satisfies Meta<typeof AmarreHomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Visitor with no session — only Collaborate's "S'authentifier" CTA is
 * active, no Complete/Follow sections, Administrate prompts signup. */
export const Anonymous: Story = {
  args: {
    userId: undefined,
    email: undefined,
    requests: [],
    rgpdUrl: RGPD_URL,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Authenticated user, no requests yet — Collaborate's "Créer" is
 * active, no Complete/Follow, Administrate shows logout. */
export const AuthenticatedEmpty: Story = {
  args: {
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: [],
    rgpdUrl: RGPD_URL,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Authenticated user with only in-progress requests — Complete shown,
 * Follow hidden. TopNavbar reflects via `hasIncompleteRequests`. */
export const AuthenticatedIncompleteOnly: Story = {
  args: {
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: [invitationAwaiting, voyageReadyForFinal],
    rgpdUrl: RGPD_URL,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Authenticated user with only fully-validated requests — Follow
 * shown, Complete hidden. */
export const AuthenticatedFollowOnly: Story = {
  args: {
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: [fullyValidated],
    rgpdUrl: RGPD_URL,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Authenticated user with a mix of all three states — every section
 * visible, TopNavbar shows all tabs. Best frame to compare the visual
 * cohesion of the home end-to-end. */
export const AuthenticatedMixed: Story = {
  args: {
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: allStates,
    rgpdUrl: RGPD_URL,
    downloadUrl: DOWNLOAD_URL,
  },
};
