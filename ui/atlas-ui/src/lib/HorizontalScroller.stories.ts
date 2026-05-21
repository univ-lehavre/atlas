import type { Meta, StoryObj } from "@storybook/svelte-vite";
import HorizontalScroller from "./HorizontalScroller.svelte";

const meta = {
  title: "amarre/primitives/HorizontalScroller",
  component: HorizontalScroller,
  parameters: {
    docs: {
      description: {
        component:
          "Horizontal scrollable strip used by Complete, Follow, Collaborate, Administrate, Retrieve. The `children` Snippet provides the items ; `headingText` is shown when the first snap tile leaves the viewport. `variant` alternates the background to break up vertical stacking. To see real content, look at the consumer stories (Complete, Follow, etc.).",
      },
    },
  },
  argTypes: {
    snap: {
      control: "select",
      options: ["none", "start", "center"],
      description: "CSS scroll-snap alignment for child items.",
    },
    variant: {
      control: "select",
      options: ["none", "light", "dark"],
      description:
        "Background variant — alternated section-by-section in the page.",
    },
  },
} satisfies Meta<typeof HorizontalScroller>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default : snap=start, no background. The scroller is empty because
 *  the `children` Snippet can't be supplied via Storybook args — the
 *  consumer stories (Complete, Follow, Collaborate) demonstrate it
 *  with real content. */
export const Default: Story = {
  args: { ariaLabel: "Demo scroller", headingText: "Demo", snap: "start" },
};

/** Light variant : pale background, used for the "Déposer" section. */
export const LightVariant: Story = {
  args: {
    ariaLabel: "Light scroller",
    headingText: "Déposer",
    variant: "light",
  },
};

/** Dark variant : darker background, used for the "Compléter" section. */
export const DarkVariant: Story = {
  args: {
    ariaLabel: "Dark scroller",
    headingText: "Compléter",
    variant: "dark",
  },
};

/** Snap none : free-scroll without snapping to tiles. */
export const NoSnap: Story = {
  args: { ariaLabel: "Free scroller", headingText: "Libre", snap: "none" },
};

/** Snap center : tiles snap to viewport center instead of start. */
export const SnapCenter: Story = {
  args: {
    ariaLabel: "Centered scroller",
    headingText: "Centré",
    snap: "center",
  },
};
