import type { Meta, StoryObj } from "@storybook/svelte-vite";
import HorizontalScroller from "./HorizontalScroller.svelte";

const meta = {
  title: "amarre/primitives/HorizontalScroller",
  component: HorizontalScroller,
  parameters: {
    docs: {
      description: {
        component:
          "Horizontal scrollable strip used by Complete, Follow, Collaborate, Administrate, Retrieve. Snippet `children` provides the items ; `headingText` is shown when the first snap tile leaves the viewport.",
      },
    },
  },
} satisfies Meta<typeof HorizontalScroller>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ariaLabel: "Demo scroller",
    headingText: "Demo",
    snap: "start",
  },
};
