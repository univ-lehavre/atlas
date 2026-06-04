// Level-1 a11y test : TopNavbar has no axe-core violations.
//
// The matchers (`toHaveNoViolations`) are registered in tests/setup.ts.
// `wcagAxeOptions` pins the WCAG 2.x AA target (ADR 0038), shared across the
// repo via @univ-lehavre/atlas-shared-config.
import { wcagAxeOptions } from "@univ-lehavre/atlas-shared-config/a11y";
import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";

import TopNavbar from "../src/lib/TopNavbar.svelte";

describe("TopNavbar.svelte a11y", () => {
  it("has no violations with no conditional tabs", async () => {
    const { container } = render(TopNavbar, {
      hasIncompleteRequests: false,
      hasRequestsInProgress: false,
    });
    expect(await axe(container, wcagAxeOptions)).toHaveNoViolations();
  });

  it("has no violations with both conditional tabs shown", async () => {
    const { container } = render(TopNavbar, {
      hasIncompleteRequests: true,
      hasRequestsInProgress: true,
    });
    expect(await axe(container, wcagAxeOptions)).toHaveNoViolations();
  });
});
