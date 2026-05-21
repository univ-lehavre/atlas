import type { Meta, StoryObj } from "@storybook/sveltekit";
import TopNavbar from "./TopNavbar.svelte";

const meta = {
  title: "amarre/TopNavbar",
  component: TopNavbar,
} satisfies Meta<typeof TopNavbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoRequests: Story = {
  args: { hasIncompleteRequests: false, hasRequestsInProgress: false },
};

export const SomeIncomplete: Story = {
  args: { hasIncompleteRequests: true, hasRequestsInProgress: false },
};

export const SomeInProgress: Story = {
  args: { hasIncompleteRequests: false, hasRequestsInProgress: true },
};

export const Both: Story = {
  args: { hasIncompleteRequests: true, hasRequestsInProgress: true },
};
