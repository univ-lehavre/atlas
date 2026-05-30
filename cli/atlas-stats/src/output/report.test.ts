import { describe, it, expect } from "vitest";
import type { AtlasCliReport, AtlasCliRow } from "@univ-lehavre/atlas-stats";
import { formatSummary, formatTable } from "./report.js";

const row = (overrides: Partial<AtlasCliRow> = {}): AtlasCliRow => ({
  packageName: "@univ-lehavre/foo",
  version: "1.2.3",
  npmPresent: true,
  ghPresent: true,
  npmReleaseCount: 4,
  ghReleaseCount: 3,
  monorepoPresent: true,
  lastPublishedAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
  totalDownloads: 1234,
  ...overrides,
});

const report = (overrides: Partial<AtlasCliReport> = {}): AtlasCliReport => ({
  warnings: [],
  summary: {
    githubReleasesForPeriod: 12,
    githubReleasesApiTotal: 50,
    githubReleasesMappedTotal: 47,
    npmReleasesTotalLabel: "100",
    packagesTotal: 8,
    packagesActive: 6,
    downloadsTotal: 2_345_678,
  },
  rows: [row()],
  splitIndex: 1,
  totals: {
    npmReleasesLabel: "100",
    ghReleasesTotal: 47,
    downloadsTotal: 2_345_678,
  },
  ...overrides,
});

describe("formatSummary", () => {
  it("includes every summary line with the period interpolated", () => {
    const text = formatSummary(report(), "week");
    expect(text).toContain("Releases GitHub (week) : 12");
    expect(text).toContain("Releases GitHub (API total) : 50");
    expect(text).toContain("Releases GitHub (mappées)   : 47");
    expect(text).toContain("Releases npm (total)        : 100");
    expect(text).toContain("Paquets (week)");
    expect(text).toContain("8 total, 6 actif(s)");
    expect(text).toContain("Downloads : 2.3 M");
  });

  it("formats sub-thousand download totals as raw integers", () => {
    const r = report({
      summary: {
        ...report().summary,
        downloadsTotal: 42,
      },
    });
    expect(formatSummary(r, "day")).toContain("Downloads : 42");
  });

  it("formats sub-million / above-thousand totals with k suffix", () => {
    const r = report({
      summary: {
        ...report().summary,
        downloadsTotal: 4_567,
      },
    });
    expect(formatSummary(r, "month")).toContain("Downloads : 4.6 k");
  });
});

describe("formatTable", () => {
  it("renders header, rows, separator and TOTAL line", () => {
    const text = formatTable(report());
    expect(text).toContain("Paquet");
    expect(text).toContain("Version");
    expect(text).toContain("Téléchargements");
    expect(text).toContain("TOTAL");
    expect(text).toContain("foo"); // scope stripped
  });

  it("strips the @univ-lehavre/ package scope from row names", () => {
    const text = formatTable(
      report({ rows: [row({ packageName: "@univ-lehavre/bar" })] }),
    );
    expect(text).toContain("bar");
    expect(text).not.toContain("@univ-lehavre/bar");
  });

  it("renders 'oui'/'non' booleans and '?' for unknown npm release counts", () => {
    const text = formatTable(
      report({
        rows: [
          row({
            npmPresent: false,
            ghPresent: false,
            monorepoPresent: false,
            npmReleaseCount: null,
          }),
        ],
      }),
    );
    expect(text).toMatch(/non/);
    expect(text).toContain("?");
  });

  it("inserts an ABSENTS DU MONOREPO divider between in-monorepo and orphan rows", () => {
    const text = formatTable(
      report({
        rows: [row({ monorepoPresent: true }), row({ monorepoPresent: false })],
        splitIndex: 1,
      }),
    );
    expect(text).toContain("ABSENTS DU MONOREPO");
  });

  it("omits the divider when splitIndex is at the boundary (0 or rows.length)", () => {
    const allOrphan = formatTable(
      report({
        rows: [row({ monorepoPresent: false })],
        splitIndex: 0,
      }),
    );
    expect(allOrphan).not.toContain("ABSENTS DU MONOREPO");

    const allIn = formatTable(
      report({
        rows: [row()],
        splitIndex: 1,
      }),
    );
    expect(allIn).not.toContain("ABSENTS DU MONOREPO");
  });

  it("renders 'aujourd'hui' / 'hier' / 'il y a N j' / 'il y a M mois' / '—' for dates", () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const tenDaysAgo = new Date(Date.now() - 86_400_000 * 10).toISOString();
    const twoMonthsAgo = new Date(Date.now() - 86_400_000 * 65).toISOString();

    const text = formatTable(
      report({
        rows: [
          row({ lastPublishedAt: today }),
          row({ lastPublishedAt: yesterday }),
          row({ lastPublishedAt: tenDaysAgo }),
          row({ lastPublishedAt: twoMonthsAgo }),
          row({ lastPublishedAt: "" }),
        ],
        splitIndex: 5,
      }),
    );
    expect(text).toContain("aujourd'hui");
    expect(text).toContain("hier");
    expect(text).toContain("il y a 10 j");
    expect(text).toContain("il y a 2 mois");
    expect(text).toContain("—");
  });

  it("renders mega downloads (>=1M) with the M suffix", () => {
    const text = formatTable(
      report({
        rows: [row({ totalDownloads: 5_400_000 })],
      }),
    );
    expect(text).toContain("5.4 M");
  });
});
