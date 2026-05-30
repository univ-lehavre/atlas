import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ResearcherRow } from "@univ-lehavre/atlas-researcher-profiles";

vi.mock("@clack/prompts", () => ({
  multiselect: vi.fn(),
  isCancel: vi.fn((v: unknown) => v === Symbol.for("clack.cancel")),
  cancel: vi.fn(),
}));

vi.mock("@univ-lehavre/atlas-researcher-profiles", () => ({
  daysUntilNextUpdate: vi.fn(),
}));

import { multiselect, isCancel, cancel } from "@clack/prompts";
import { daysUntilNextUpdate } from "@univ-lehavre/atlas-researcher-profiles";
import { selectResearchers } from "./select-researchers.js";

const row = (overrides: Partial<ResearcherRow> = {}): ResearcherRow => ({
  userid: "u1",
  last_name: "Doe",
  middle_name: "",
  first_name: "Jane",
  orcid: "",
  oa_imported_at: "",
  oa_locked_at: "",
  openalex_complete: "0",
  ...overrides,
});

describe("selectResearchers", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      _code?: number,
    ) => {
      /* noop */
    }) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it("filters researchers to those selected by the user", async () => {
    vi.mocked(multiselect).mockResolvedValue(["u1", "u3"] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    const all = [
      row({ userid: "u1", first_name: "Alice", last_name: "Aaron" }),
      row({ userid: "u2", first_name: "Bob", last_name: "Brown" }),
      row({ userid: "u3", first_name: "Carol", last_name: "Clark" }),
    ];

    const result = await selectResearchers(all);
    expect(result.map((r) => r.userid)).toEqual(["u1", "u3"]);
  });

  it("sorts options alphabetically by last_name (fr collation)", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    const all = [
      row({ userid: "u1", last_name: "Émile" }),
      row({ userid: "u2", last_name: "Aaron" }),
      row({ userid: "u3", last_name: "Zorro" }),
    ];

    await selectResearchers(all);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      options: { value: string }[];
    };
    expect(call.options.map((o) => o.value)).toEqual(["u2", "u1", "u3"]);
  });

  it("pre-selects all userids when preselectAll=true", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    const all = [row({ userid: "u1" }), row({ userid: "u2" })];
    await selectResearchers(all, true);

    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      initialValues: string[];
    };
    expect(call.initialValues.toSorted()).toEqual(["u1", "u2"]);
  });

  it("leaves initialValues empty when preselectAll is omitted", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([row()]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      initialValues: string[];
    };
    expect(call.initialValues).toEqual([]);
  });

  it("renders an ORCID hint when present and not 'null'", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([row({ orcid: "0000-0001-2345-6789" })]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      options: { hint: string }[];
    };
    expect(call.options[0]!.hint).toContain("ORCID: 0000-0001-2345-6789");
  });

  it("falls back to userid when orcid is empty or literal 'null'", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([
      row({ userid: "u-empty", orcid: "" }),
      row({ userid: "u-null", orcid: "null", last_name: "Zzz" }),
    ]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      options: { value: string; hint: string }[];
    };
    expect(call.options[0]!.hint).toContain("u-empty");
    expect(call.options[1]!.hint).toContain("u-null");
  });

  it("adds an [LOCKED] marker when oa_locked_at is set", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([row({ oa_locked_at: "2025-01-01T00:00:00Z" })]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      options: { hint: string }[];
    };
    expect(call.options[0]!.hint).toContain("[LOCKED]");
  });

  it("shows 'update in Nd' when daysUntilNextUpdate returns a number", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(7);

    await selectResearchers([row({ oa_imported_at: "2026-01-01T00:00:00Z" })]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      options: { hint: string }[];
    };
    expect(call.options[0]!.hint).toContain("update in 7d");
  });

  it("shows 'imported …' when daysUntilNextUpdate returns null with an import date", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([row({ oa_imported_at: "2024-06-15T12:00:00Z" })]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      options: { hint: string }[];
    };
    expect(call.options[0]!.hint).toContain("imported 2024-06-15");
  });

  it("exits via process.exit(0) when the prompt is cancelled", async () => {
    const cancelSymbol = Symbol.for("clack.cancel");
    vi.mocked(multiselect).mockResolvedValue(cancelSymbol as never);
    vi.mocked(isCancel).mockReturnValue(true);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([row()]);

    expect(cancel).toHaveBeenCalledWith("Cancelled.");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("returns an empty array when multiselect returns a non-array (defensive)", async () => {
    vi.mocked(multiselect).mockResolvedValue("nope" as never);
    vi.mocked(isCancel).mockReturnValue(false);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    const result = await selectResearchers([row()]);
    expect(result).toEqual([]);
  });

  it("includes total count in the prompt message", async () => {
    vi.mocked(multiselect).mockResolvedValue([] as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    await selectResearchers([row({ userid: "a" }), row({ userid: "b" })]);
    const call = vi.mocked(multiselect).mock.calls[0]?.[0] as {
      message: string;
    };
    expect(call.message).toContain("2");
  });
});
