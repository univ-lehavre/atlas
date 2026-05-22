import type { Meta, StoryObj } from "@storybook/svelte-vite";
import AnonymousHome from "./AnonymousHome.svelte";
import type { AnonymousResearcherList } from "./types/anonymous-researcher";

// Preview of the homepage rendered when no user is authenticated.
// The fixture below uses fake names + public avatar placeholders
// (i.pravatar.cc with the `?u=` deterministic-seed mode, so each
// research keeps the same face across reloads). When the pool has
// more than 8 entries, the component rotates one slot every 5s.

const researchers: AnonymousResearcherList = Array.from(
  { length: 24 },
  (_, i) => ({
    id: `rsr-${i + 1}`,
    fullName: `Personne Fictive ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
    photoUrl: `https://i.pravatar.cc/300?u=storybook-rsr-${i + 1}`,
    bio: "Profil de démonstration — domaine de recherche fictif lié au littoral.",
  }),
);

const meta = {
  title: "Pages/AnonymousHome",
  component: AnonymousHome,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<AnonymousHome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    signupUrl: "/signup",
    researchers,
  },
};

export const NoRotation: Story = {
  args: {
    signupUrl: "/signup",
    researchers: researchers.slice(0, 8),
  },
};

export const FewResearchers: Story = {
  args: {
    signupUrl: "/signup",
    researchers: researchers.slice(0, 3),
  },
};
