import type { Meta, StoryObj } from "@storybook/svelte-vite";
import CreateRequest from "./CreateRequest.svelte";

const meta = {
  title: "amarre/CreateRequest",
  component: CreateRequest,
  parameters: {
    docs: {
      description: {
        component:
          "Create-request modal body. The submit button stays disabled until the consent checkbox is ticked. `rgpdUrl` is provided by the consumer app (typically read from `PUBLIC_RGPD_NOTICE_URL` in amarre's case).",
      },
    },
  },
} satisfies Meta<typeof CreateRequest>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { rgpdUrl: "https://example.com/rgpd-notice" },
};
