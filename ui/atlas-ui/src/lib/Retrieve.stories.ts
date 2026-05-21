import type { Meta, StoryObj } from "@storybook/sveltekit";
import Retrieve from "./Retrieve.svelte";

const meta = {
  title: "amarre/Retrieve",
  component: Retrieve,
  parameters: {
    docs: {
      description: {
        component:
          "Static informational scroller (mostly markup, no business state). Visual check of layout + Bootstrap spacing.",
      },
    },
  },
} satisfies Meta<typeof Retrieve>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
