import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import type { ResearcherRow } from "@univ-lehavre/atlas-researcher-profiles";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  outro: vi.fn(),
}));

vi.mock("@univ-lehavre/atlas-researcher-profiles", () => ({
  fetchResearchers: vi.fn(),
  daysUntilNextUpdate: vi.fn(),
}));

vi.mock("../prompts/select-researchers.js", () => ({
  selectResearchers: vi.fn(),
}));

vi.mock("./match-row.js", () => ({
  matchRow: vi.fn(),
}));

import { outro, log } from "@clack/prompts";
import { fetchResearchers } from "@univ-lehavre/atlas-researcher-profiles";
import { selectResearchers } from "../prompts/select-researchers.js";
import { matchRow } from "./match-row.js";
import { matchReferencesCommand } from "./match-references.js";

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

const baseOpts = {
  crfUrl: "http://x",
  crfToken: "tok",
  threshold: 0.2,
  citationUserAgent: "ua",
  citationApiKey: "key",
};

describe("matchReferencesCommand", () => {
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

  it("exits when fetchResearchers fails", async () => {
    exitSpy.mockImplementation(((_code?: number) => {
      throw new Error("__exit__");
    }) as never);
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.fail(new Error("boom")) as never,
    );

    await expect(matchReferencesCommand(baseOpts)).rejects.toThrow("__exit__");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(matchRow).not.toHaveBeenCalled();
  });

  it("outros early when there are no pending researchers", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([row({ openalex_complete: "2" })]) as never,
    );

    await matchReferencesCommand(baseOpts);

    expect(outro).toHaveBeenCalledWith("All researchers are already complete");
    expect(selectResearchers).not.toHaveBeenCalled();
    expect(matchRow).not.toHaveBeenCalled();
  });

  it("uses provided userids to bypass the interactive prompt", async () => {
    const r1 = row({ userid: "u1" });
    const r2 = row({ userid: "u2" });
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([r1, r2]) as never,
    );
    vi.mocked(matchRow).mockResolvedValue("ok");

    await matchReferencesCommand({ ...baseOpts, userids: ["u2"] });

    expect(selectResearchers).not.toHaveBeenCalled();
    expect(matchRow).toHaveBeenCalledTimes(1);
    expect(vi.mocked(matchRow).mock.calls[0]?.[0].userid).toBe("u2");
  });

  it("delegates to selectResearchers when no userids are provided", async () => {
    const r1 = row({ userid: "u1" });
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r1]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r1]);
    vi.mocked(matchRow).mockResolvedValue("ok");

    await matchReferencesCommand(baseOpts);

    expect(selectResearchers).toHaveBeenCalledTimes(1);
    expect(selectResearchers).toHaveBeenCalledWith([r1], true);
    expect(matchRow).toHaveBeenCalledTimes(1);
  });

  it("tallies counts of ok/skipped/error across rows", async () => {
    const rows = [
      row({ userid: "u1" }),
      row({ userid: "u2" }),
      row({ userid: "u3" }),
      row({ userid: "u4" }),
    ];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rows) as never);
    vi.mocked(selectResearchers).mockResolvedValue(rows);
    vi.mocked(matchRow)
      .mockResolvedValueOnce("ok")
      .mockResolvedValueOnce("skipped")
      .mockResolvedValueOnce("error")
      .mockResolvedValueOnce("error");

    await matchReferencesCommand(baseOpts);

    expect(matchRow).toHaveBeenCalledTimes(4);
    const outroCall = vi.mocked(outro).mock.calls[0]?.[0] as string;
    expect(outroCall).toContain("1 skipped");
    expect(outroCall).toContain("2 errors");
  });

  it("outros 'Nothing to do' when the selection is empty", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([]);

    await matchReferencesCommand(baseOpts);

    expect(matchRow).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith("Nothing to do");
  });

  it("logs a hint when some researchers are already complete", async () => {
    const r1 = row({ userid: "u1", openalex_complete: "0" });
    const r2 = row({ userid: "u2", openalex_complete: "2" });
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([r1, r2]) as never,
    );
    vi.mocked(selectResearchers).mockResolvedValue([r1]);
    vi.mocked(matchRow).mockResolvedValue("ok");

    await matchReferencesCommand(baseOpts);

    const infoMessages = vi
      .mocked(log.info)
      .mock.calls.map((c) => String(c[0]));
    expect(infoMessages.some((m) => m.includes("complete"))).toBe(true);
  });

  it("passes the configured threshold to matchRow", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(matchRow).mockResolvedValue("ok");

    await matchReferencesCommand({ ...baseOpts, threshold: 0.42 });

    const cfg = vi.mocked(matchRow).mock.calls[0]?.[1] as { threshold: number };
    expect(cfg.threshold).toBe(0.42);
  });
});
