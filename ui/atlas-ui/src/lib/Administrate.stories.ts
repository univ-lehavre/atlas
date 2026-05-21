import type { Meta, StoryObj } from "@storybook/sveltekit";
import Administrate from "./Administrate.svelte";

const meta = {
  title: "amarre/Administrate",
  component: Administrate,
  parameters: {
    docs: {
      description: {
        component:
          "User-administration tile : exposes signup (when no session) and logout (when authenticated).",
      },
    },
  },
} satisfies Meta<typeof Administrate>;

export default meta;
type Story = StoryObj<typeof meta>;

const DOWNLOAD_URL = "/api/v1/surveys/download";

export const Anonymous: Story = {
  args: {
    userId: undefined,
    email: undefined,
    form: null,
    downloadUrl: DOWNLOAD_URL,
  },
};

export const Authenticated: Story = {
  args: {
    userId: "usr_demo_42",
    email: "demo@example.org",
    form: null,
    downloadUrl: DOWNLOAD_URL,
  },
};
