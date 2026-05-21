import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Rule from "./Rule.svelte";

const meta = {
  title: "amarre/Primitives/Rule",
  component: Rule,
  parameters: {
    docs: {
      description: {
        component: "Thin horizontal separator (`<hr>` with utility classes).",
      },
    },
  },
} satisfies Meta<typeof Rule>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
