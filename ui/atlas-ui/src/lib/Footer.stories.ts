import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Footer from "./Footer.svelte";

const meta = {
  title: "amarre/primitives/Footer",
  component: Footer,
  parameters: {
    docs: {
      description: {
        component:
          "Renders the 4 hardcoded partner logos (ULHN, EUNICoast, France 2030, Région Normandie). Note : images live in `apps/amarre/static/logos/` ; in Storybook the broken-image icons signal the assets are not in this package.",
      },
    },
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
