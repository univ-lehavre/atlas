import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Collaborate from "./Collaborate.svelte";
import { noRequests, oneFormInProgressRequest } from "./fixtures";

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

/** Authenticated user, no draft in progress — both "S'authentifier" is
 * disabled and "Créer une nouvelle" is active. Visually identical for
 * any other request shape that satisfies `allowedRequestCreation`
 * (e.g. all previous requests at `form_complete === '2'`). */
export const CanCreate: Story = {
  args: { userId: "usr_demo_42", requests: noRequests, rgpdUrl: RGPD_URL },
};

/** Authenticated user with one request still being filled
 * (`form_complete === '0'`) — `allowedRequestCreation` returns false, so
 * the "Créer une nouvelle" button is disabled (no second draft until
 * the first one's form is complete). */
export const Blocked: Story = {
  args: {
    userId: "usr_demo_42",
    requests: oneFormInProgressRequest,
    rgpdUrl: RGPD_URL,
  },
};
