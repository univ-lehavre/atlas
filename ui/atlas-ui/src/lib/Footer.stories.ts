import type { Meta, StoryObj } from "@storybook/svelte-vite";
import Footer from "./Footer.svelte";

const meta = {
  title: "amarre/Navigation/Footer",
  component: Footer,
  parameters: {
    docs: {
      description: {
        component:
          "Renders a row of partner / funder logos provided by the consumer. The component owns layout only ; brand identity (alt-text + asset paths) lives in the app. Stories use fake placeholders — broken-image icons are expected since the assets only exist in the consumer app's `static/`.",
      },
    },
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

const fakeLogos = [
  { src: "/fake-logos/partner-a.png", alt: "Partenaire Fictif A" },
  { src: "/fake-logos/partner-b.png", alt: "Partenaire Fictif B" },
  { src: "/fake-logos/partner-c.png", alt: "Partenaire Fictif C" },
  { src: "/fake-logos/partner-d.png", alt: "Partenaire Fictif D" },
];

/** Four placeholder partners — covers the typical amarre layout. */
export const FourLogos: Story = { args: { logos: fakeLogos } };

/** No partners — the footer still renders its layout container. */
export const Empty: Story = { args: { logos: [] } };

/** Single logo — checks centering when the row has only one item. */
export const OneLogo: Story = { args: { logos: fakeLogos.slice(0, 1) } };
