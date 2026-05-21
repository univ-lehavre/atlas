import type { Meta, StoryObj } from "@storybook/sveltekit";
import { signupRateLimited, signupSuccess, signupWrongEmail } from "./fixtures";
import Signup from "./Signup.svelte";

const meta = {
  title: "amarre/Signup",
  component: Signup,
  parameters: {
    docs: {
      description: {
        component:
          "Sign-up modal body. Reads SvelteKit `form` prop : `data` → success alert, `wrongSignupEmail` → error alert.",
      },
    },
  },
} satisfies Meta<typeof Signup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { form: null } };
export const Success: Story = { args: { form: signupSuccess } };
export const WrongEmail: Story = { args: { form: signupWrongEmail } };
export const RateLimited: Story = { args: { form: signupRateLimited } };
