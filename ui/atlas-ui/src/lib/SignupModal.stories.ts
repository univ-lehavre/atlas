import type { Meta, StoryObj } from "@storybook/svelte-vite";
import SignupModal from "./SignupModal.svelte";

// Storybook variants for the email-only signup modal. The `<dialog>`
// HTML5 element only opens via `.showModal()`, so each story renders
// the modal already open by forcing `open=true`.

const meta = {
  title: "Pages/SignupModal",
  component: SignupModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<SignupModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onClose: () => undefined,
    onSubmit: async (email: string) => {
      console.log("submit", email);
    },
  },
};

export const FailingSubmit: Story = {
  args: {
    open: true,
    onClose: () => undefined,
    onSubmit: async () => {
      throw new Error("Adresse non autorisée pour cette plateforme.");
    },
  },
};

export const CustomCopy: Story = {
  args: {
    open: true,
    onClose: () => undefined,
    title: "Rejoignez la communauté",
    description:
      "Indiquez votre email institutionnel ; un lien magique sera envoyé pour vous connecter.",
    onSubmit: async (email: string) => {
      console.log("submit", email);
    },
  },
};
