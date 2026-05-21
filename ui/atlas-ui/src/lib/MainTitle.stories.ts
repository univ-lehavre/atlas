import type { Meta, StoryObj } from "@storybook/svelte-vite";
import MainTitle from "./MainTitle.svelte";

const meta = {
  title: "amarre/Navigation/MainTitle",
  component: MainTitle,
  parameters: {
    docs: {
      description: {
        component:
          "Top banner with the brand logo. The consumer owns the asset URL + alt text + home URL — the component handles layout only. Stories use a fake placeholder image so the package stays free of brand assets.",
      },
    },
  },
} satisfies Meta<typeof MainTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Placeholder logo — the actual brand asset lives in the consumer app. */
export const Default: Story = {
  args: {
    logoSrc: "https://placehold.co/240x120/0066cc/ffffff?text=Fake+Brand",
    logoAlt: "Marque Fictive",
    homeUrl: "/",
  },
};
