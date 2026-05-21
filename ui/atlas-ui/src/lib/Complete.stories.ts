import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Complete from "./Complete.svelte";
import { mixedRequests, noRequests, oneIncompleteRequest } from "./fixtures";

const meta = {
  title: "amarre/Complete",
  component: Complete,
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal scroller of requests still in completion (`validation_finale_complete !== "2"`).',
      },
    },
  },
} satisfies Meta<typeof Complete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { requests: noRequests } };
export const One: Story = { args: { requests: oneIncompleteRequest } };
export const Mixed: Story = { args: { requests: mixedRequests } };
