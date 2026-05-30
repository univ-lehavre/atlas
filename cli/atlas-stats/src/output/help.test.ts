import { describe, it, expect } from "vitest";
import { formatHelp } from "./help.js";

describe("formatHelp", () => {
  it("describes the CLI and lists every option", () => {
    const help = formatHelp();
    expect(help).toContain("atlas-stats");
    expect(help).toContain("Usage:");
    expect(help).toContain("--token");
    expect(help).toContain("--period");
    expect(help).toContain("--force");
    expect(help).toContain("--json");
    expect(help).toContain("-h, --help");
  });

  it("includes the GITHUB_TOKEN environment hint", () => {
    expect(formatHelp()).toContain("GITHUB_TOKEN");
  });
});
