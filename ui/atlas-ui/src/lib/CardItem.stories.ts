import type { Meta, StoryObj } from "@storybook/sveltekit";
import CardItem from "./CardItem.svelte";

const meta = {
  title: "amarre/primitives/CardItem",
  component: CardItem,
  parameters: {
    docs: {
      description: {
        component:
          'Bootstrap-flavoured card with optional `imageSrc`, `imageAlt`, `width` and Snippet slots : `title`, `description`, `bodyExtra`, `actions`, `links`, `footer`. Renders nothing when no slot is filled — see the "Empty" story.',
      },
    },
  },
} satisfies Meta<typeof CardItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithImage: Story = {
  args: {
    imageSrc: "https://placehold.co/400x200/0066cc/ffffff?text=Atlas+UI",
    imageAlt: "Placeholder",
    width: "20rem",
  },
};
