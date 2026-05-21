import type { Meta, StoryObj } from "@storybook/svelte-vite";
import MainTitle from "./MainTitle.svelte";

const meta = {
  title: "amarre/primitives/MainTitle",
  component: MainTitle,
  parameters: {
    docs: {
      description: {
        component:
          "Top banner with the AMARRE logo. The logo `<img>` points at `/logos/amarre.png` ; the file lives in `apps/amarre/static/logos/`, so the image shows broken inside this package — that is the cost of `static` assets not following the component.",
      },
    },
  },
} satisfies Meta<typeof MainTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
