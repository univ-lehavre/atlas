import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Follow from "./Follow.svelte";
import { mixedRequests, noRequests, oneInProgressRequest } from "./fixtures";

const meta = {
  title: "amarre/Follow",
  component: Follow,
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal scroller of requests that have reached the final validation step (`validation_finale_complete === "2"`).',
      },
    },
  },
} satisfies Meta<typeof Follow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { requests: noRequests } };
export const One: Story = { args: { requests: oneInProgressRequest } };
export const Mixed: Story = { args: { requests: mixedRequests } };
