import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Administrate from "./Administrate.svelte";

const meta = {
  title: "amarre/Sections/Administrate",
  component: Administrate,
  parameters: {
    docs: {
      description: {
        component:
          "User-administration tile : exposes signup (when no session) and logout (when authenticated). Embeds the Signup modal — but the modal stays closed in Storybook (Bootstrap JS toggle isn't loaded in the preview iframe), so signup form states are covered by the dedicated `Signup` stories, not here.",
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
