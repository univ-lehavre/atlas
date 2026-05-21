import type { Meta, StoryObj } from "@storybook/sveltekit";
import Collaborate from "./Collaborate.svelte";
import {
  noRequests,
  oneIncompleteRequest,
  oneInProgressRequest,
} from "./fixtures";

const meta = {
  title: "amarre/Collaborate",
  component: Collaborate,
  parameters: {
    docs: {
      description: {
        component:
          'Entry tile to start a new collaboration request. The "Créer" button is hidden when one of the user\'s requests still has `form_complete !== "2"` (delegated to `allowedRequestCreation`).',
      },
    },
  },
} satisfies Meta<typeof Collaborate>;

export default meta;
type Story = StoryObj<typeof meta>;

const RGPD_URL = "https://example.com/rgpd-notice";

export const Anonymous: Story = {
  args: { userId: undefined, requests: noRequests, rgpdUrl: RGPD_URL },
};

export const NoRequests: Story = {
  args: { userId: "usr_demo_42", requests: noRequests, rgpdUrl: RGPD_URL },
};

export const HasInProgressOnly: Story = {
  args: {
    userId: "usr_demo_42",
    requests: oneInProgressRequest,
    rgpdUrl: RGPD_URL,
  },
};

export const Blocked: Story = {
  // form_complete !== '2' on the existing request → create disabled.
  args: {
    userId: "usr_demo_42",
    requests: oneIncompleteRequest,
    rgpdUrl: RGPD_URL,
  },
};
