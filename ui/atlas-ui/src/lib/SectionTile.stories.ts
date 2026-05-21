import type { Meta, StoryObj } from "@storybook/svelte-vite";
import SectionTile from "./SectionTile.svelte";

const meta = {
  title: "amarre/primitives/SectionTile",
  component: SectionTile,
  argTypes: {
    title: { control: "text" },
    width: { control: "text" },
  },
} satisfies Meta<typeof SectionTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { title: "Compléter" } };
export const Narrow: Story = { args: { title: "Suivre", width: "12rem" } };
