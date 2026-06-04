// Level-1 a11y test : Signup + CreateRequest modal forms.
//
// The matchers (`toHaveNoViolations`) are registered in tests/setup.ts.
//
// Both modals render their closed state with the `inert` attribute on the
// `.modal` root (managed by the `modalInert` action, which lifts it while the
// modal is open via Bootstrap's `show.bs.modal` / `hidden.bs.modal` events).
// `inert` removes the focusable descendants from the tab order AND the
// accessibility tree, so axe's `aria-hidden-focus` rule no longer fires on the
// closed render — and ALL axe rules stay enforced (no per-rule derogation).
//
// `wcagAxeOptions` pins the WCAG 2.x AA target (ADR 0038), shared across the
// repo via @univ-lehavre/atlas-shared-config.
import { wcagAxeOptions } from "@univ-lehavre/atlas-shared-config/a11y";
import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";

import Signup from "../src/lib/Signup.svelte";
import CreateRequest from "../src/lib/CreateRequest.svelte";

describe("Signup.svelte a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(Signup, { form: null });
    expect(await axe(container, wcagAxeOptions)).toHaveNoViolations();
  });
});

describe("CreateRequest.svelte a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(CreateRequest, {
      rgpdUrl: "https://example.test/rgpd",
      platformName: "Atlas",
    });
    expect(await axe(container, wcagAxeOptions)).toHaveNoViolations();
  });
});
