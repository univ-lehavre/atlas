import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Administrate from "./Administrate.svelte";
import { signupRateLimited, signupSuccess, signupWrongEmail } from "./fixtures";

const meta = {
  title: "amarre/Administrate",
  component: Administrate,
  parameters: {
    docs: {
      description: {
        component:
          "User-administration tile : exposes signup (when no session) and logout (when authenticated). Embeds the Signup modal — when `form?.data` is set, the modal opens automatically with the success alert.",
      },
    },
  },
} satisfies Meta<typeof Administrate>;

export default meta;
type Story = StoryObj<typeof meta>;

const DOWNLOAD_URL = "/api/v1/surveys/download";

/** Visitor with no session — signup CTA visible, logout hidden. */
export const Anonymous: Story = {
  args: {
    userId: undefined,
    email: undefined,
    form: null,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Authenticated user — email displayed + logout CTA. */
export const Authenticated: Story = {
  args: {
    userId: "usr_demo_42",
    email: "demo@example.org",
    form: null,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Anonymous + signup just succeeded — success alert in the Signup modal. */
export const SignupSuccess: Story = {
  args: {
    userId: undefined,
    email: undefined,
    form: signupSuccess,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Anonymous + signup rejected (domain whitelist). */
export const SignupWrongEmail: Story = {
  args: {
    userId: undefined,
    email: undefined,
    form: signupWrongEmail,
    downloadUrl: DOWNLOAD_URL,
  },
};

/** Anonymous + signup rate-limited. */
export const SignupRateLimited: Story = {
  args: {
    userId: undefined,
    email: undefined,
    form: signupRateLimited,
    downloadUrl: DOWNLOAD_URL,
  },
};
