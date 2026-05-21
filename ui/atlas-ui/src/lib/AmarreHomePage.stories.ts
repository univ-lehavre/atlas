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

// All records below have `validation_finale_complete !== '2'` so they
// land in the Complete section (amarre's "incomplete" filter). They
// span every branch Request.svelte renders : the new-draft fallback,
// invitation flow at three signature stages, voyage flow for two
// statuts, and the enseignant special case.

const blankDraft: RequestRecord = {
  ...base,
  record_id: "fake-draft",
  form_complete: "0",
  invitation_type: "",
  mobilite_type: "",
  form: "https://example.com/forms/fake-draft",
};

const invitationFormInProgress: RequestRecord = {
  ...base,
  record_id: "fake-inv-form",
  invite_nom: "Personne Fictive A",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
  form_complete: "0",
  form: "https://example.com/forms/fake-inv-form",
};

const invitationAwaitingComposante: RequestRecord = {
  ...base,
  record_id: "fake-inv-await",
  invite_nom: "Personne Fictive A",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
};

const invitationReadyForFinal: RequestRecord = {
  ...invitationAwaitingComposante,
  record_id: "fake-inv-ready",
  demandeur_composante_complete: "2",
  validation_finale: "https://example.com/forms/fake-inv-final",
};

const voyageEtudiantAwaiting: RequestRecord = {
  ...base,
  record_id: "fake-voyage-etu",
  mobilite_type: "2",
  mobilite_universite_eunicoast: "Université Fictive Bravo",
};

const voyageOtherReadyForFinal: RequestRecord = {
  ...base,
  record_id: "fake-voyage-other",
  demandeur_statut: "3",
  mobilite_type: "2",
  invitation_type: "",
  mobilite_universite_autre: "Université Fictive Charlie",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale: "https://example.com/forms/fake-voyage-final",
};

const enseignantInvitation: RequestRecord = {
  ...base,
  record_id: "fake-enseignant",
  demandeur_statut: "2",
  invite_nom: "Personne Fictive B",
  invitation_type: "1",
  mobilite_universite_autre: "Université Fictive Delta",
  demandeur_composante_complete: "2",
};

const allCompleteVariants: RequestRecordList = [
  blankDraft,
  invitationFormInProgress,
  invitationAwaitingComposante,
  invitationReadyForFinal,
  voyageEtudiantAwaiting,
  voyageOtherReadyForFinal,
  enseignantInvitation,
];

// Follow shows requests where `validation_finale_complete === '2'`. The
// records below are each flow's fully-validated terminal state — Request
// renders them with every progress row green and the PDF download link
// active.

const followBase: RequestRecord = {
  ...base,
  form_complete: "2",
  demandeur_composante_complete: "2",
  labo_complete: "2",
  encadrant_complete: "2",
  validation_finale_complete: "2",
};

const invitationDone: RequestRecord = {
  ...followBase,
  record_id: "fake-follow-invitation",
  invite_nom: "Personne Fictive A",
  invitation_type: "2",
  mobilite_universite_gu8: "Université Fictive Alpha",
};

const voyageEtudiantDone: RequestRecord = {
  ...followBase,
  record_id: "fake-follow-voyage-etu",
  mobilite_type: "2",
  mobilite_universite_eunicoast: "Université Fictive Bravo",
};

const voyageOtherDone: RequestRecord = {
  ...followBase,
  record_id: "fake-follow-voyage-other",
  demandeur_statut: "3",
  mobilite_type: "2",
  invitation_type: "",
  mobilite_universite_autre: "Université Fictive Charlie",
};

const enseignantInvitationDone: RequestRecord = {
  ...followBase,
  record_id: "fake-follow-enseignant",
  demandeur_statut: "2",
  invite_nom: "Personne Fictive B",
  invitation_type: "1",
  mobilite_universite_autre: "Université Fictive Delta",
};

const allFollowVariants: RequestRecordList = [
  invitationDone,
  voyageEtudiantDone,
  voyageOtherDone,
  enseignantInvitationDone,
];

const RGPD_URL = "https://example.com/rgpd-notice";
const DOWNLOAD_URL = "/api/v1/surveys/download";
const FAKE_BRAND = {
  logoSrc: "https://placehold.co/240x120/0066cc/ffffff?text=Fake+Brand",
  logoAlt: "Marque Fictive",
  homeUrl: "/",
  platformName: "Plateforme Fictive",
};
const FAKE_FOOTER_LOGOS = [
  { src: "/fake-logos/partner-a.png", alt: "Partenaire Fictif A" },
  { src: "/fake-logos/partner-b.png", alt: "Partenaire Fictif B" },
  { src: "/fake-logos/partner-c.png", alt: "Partenaire Fictif C" },
  { src: "/fake-logos/partner-d.png", alt: "Partenaire Fictif D" },
];
const SHARED = {
  ...FAKE_BRAND,
  rgpdUrl: RGPD_URL,
  downloadUrl: DOWNLOAD_URL,
  footerLogos: FAKE_FOOTER_LOGOS,
};

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
    ...SHARED,
    userId: undefined,
    email: undefined,
    requests: [],
  },
};

/** Authenticated user, no requests yet — Collaborate's "Créer" is
 * active, no Complete/Follow, Administrate shows logout. */
export const AuthenticatedEmpty: Story = {
  args: {
    ...SHARED,
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: [],
  },
};

/** Freshly-created request — authenticated user with a single record
 * just inserted by `newRequest`. `form_complete='0'`, no flow chosen
 * yet, only `record_id` + `created_at` populated. Complete renders the
 * card with all rows in the yellow "à compléter" state ; the
 * Formulaire link points at the resume-edit URL. */
export const CompleteFreshlyCreated: Story = {
  args: {
    ...SHARED,
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: [blankDraft],
  },
};

/** Compléter showcase — authenticated user whose Complete section
 * holds one card per Request.svelte rendering branch :
 *
 *   1. Blank draft (no flow chosen yet, form unfilled).
 *   2. Invitation, form in progress.
 *   3. Invitation, awaiting composante's signature.
 *   4. Invitation, ready for the user's final validation.
 *   5. Voyage by an étudiant, awaiting labo.
 *   6. Voyage by an autre statut, ready for final validation.
 *   7. Enseignant inviting (composanteShouldSign fires for any
 *      invitation type).
 *
 * Use this story to compare side-by-side how Request renders every
 * progress state. The Complete scroller scrolls horizontally once the
 * tiles overflow the viewport. */
export const CompleteShowcase: Story = {
  args: {
    ...SHARED,
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: allCompleteVariants,
  },
};

/** Complete + Follow side-by-side — authenticated user whose history
 * spans both sections. The Complete scroller holds in-progress records
 * (form unfilled, awaiting signatures, ready for final), and the
 * Follow scroller holds the fully-validated terminal cases. Useful to
 * eyeball the full vertical rhythm of the page : MainTitle, navbar,
 * Collaborate, Complete, Follow, Administrate, Footer all visible. */
export const CompleteAndFollowMixed: Story = {
  args: {
    ...SHARED,
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: [
      blankDraft,
      invitationAwaitingComposante,
      voyageOtherReadyForFinal,
      invitationDone,
      voyageEtudiantDone,
    ],
  },
};

/** Suivre showcase — authenticated user whose Follow section holds
 * one card per Request.svelte flow at the fully-validated terminal
 * state :
 *
 *   1. Invitation, all signatures + final validation done.
 *   2. Voyage by an étudiant, fully validated.
 *   3. Voyage by an autre statut, fully validated.
 *   4. Enseignant inviting, fully validated.
 *
 * Because every request has `validation_finale_complete === '2'`,
 * Complete is hidden and only Follow renders. Use this story to
 * compare how Request renders each flow's "green" terminal state. */
export const FollowShowcase: Story = {
  args: {
    ...SHARED,
    userId: "usr_demo_42",
    email: "demo@example.org",
    requests: allFollowVariants,
  },
};
