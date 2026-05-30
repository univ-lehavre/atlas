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

vi.mock("./process-row.js", () => ({
  processRow: vi.fn(),
}));

import { outro } from "@clack/prompts";
import {
  fetchResearchers,
  daysUntilNextUpdate,
} from "@univ-lehavre/atlas-researcher-profiles";
import { selectResearchers } from "../prompts/select-researchers.js";
import { processRow } from "./process-row.js";
import { fromCrf } from "./from-crf.js";

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
  citationUserAgent: "ua",
  citationApiKey: "key",
};

describe("fromCrf", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((_c?: number) => {
      throw new Error("__exit__");
    }) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it("exits when fetchResearchers fails", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.fail(new Error("boom")) as never,
    );

    await expect(fromCrf(baseOpts)).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("outros early and returns [] when nothing pending", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([row({ openalex_complete: "2" })]) as never,
    );
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);

    const result = await fromCrf(baseOpts);

    expect(result).toEqual([]);
    expect(outro).toHaveBeenCalledWith(
      "All researchers are up-to-date — nothing to do",
    );
    expect(selectResearchers).not.toHaveBeenCalled();
  });

  it("partitions complete / up-to-date / pending and prompts only for pending", async () => {
    const complete = row({ userid: "u1", openalex_complete: "2" });
    const upToDate = row({
      userid: "u2",
      openalex_complete: "0",
      oa_imported_at: "2026-01-01T00:00:00Z",
    });
    const pending = row({ userid: "u3", openalex_complete: "0" });

    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([complete, upToDate, pending]) as never,
    );
    // daysUntilNextUpdate returns a number => up-to-date; null => pending
    vi.mocked(daysUntilNextUpdate).mockImplementation((iso?: string) =>
      iso && iso !== "" ? 5 : null,
    );
    vi.mocked(selectResearchers).mockResolvedValue([pending]);
    vi.mocked(processRow).mockResolvedValue("ok");

    await fromCrf(baseOpts);

    expect(selectResearchers).toHaveBeenCalledTimes(1);
    const promptedIds = (
      vi.mocked(selectResearchers).mock.calls[0]?.[0] as ResearcherRow[]
    ).map((r) => r.userid);
    expect(promptedIds).toEqual(["u3"]);
    expect(processRow).toHaveBeenCalledTimes(1);
  });

  it("invokes processRow per researcher and returns the selection", async () => {
    const r1 = row({ userid: "u1" });
    const r2 = row({ userid: "u2" });
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([r1, r2]) as never,
    );
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);
    vi.mocked(selectResearchers).mockResolvedValue([r1, r2]);
    vi.mocked(processRow)
      .mockResolvedValueOnce("ok")
      .mockResolvedValueOnce("skipped");

    const result = await fromCrf(baseOpts);

    expect(result).toHaveLength(2);
    expect(processRow).toHaveBeenCalledTimes(2);
    const outroMsg = vi.mocked(outro).mock.calls[0]?.[0] as string;
    expect(outroMsg).toContain("1 skipped");
  });

  it("reports errors in the outro message", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("error");

    await fromCrf(baseOpts);

    const outroMsg = vi.mocked(outro).mock.calls[0]?.[0] as string;
    expect(outroMsg).toContain("1 errors");
  });

  it("forwards batch flag to processRow", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("ok");

    await fromCrf({ ...baseOpts, batch: true });

    const batchArg = vi.mocked(processRow).mock.calls[0]?.[4];
    expect(batchArg).toBe(true);
  });

  it("omits apiKey in citation config when not provided", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("ok");

    const withoutKey = { ...baseOpts };
    delete (withoutKey as { citationApiKey?: string }).citationApiKey;
    await fromCrf(withoutKey);

    const cfg = vi.mocked(processRow).mock.calls[0]?.[2] as {
      userAgent: string;
      apiKey?: string;
    };
    expect(cfg.userAgent).toBe("ua");
    expect(cfg.apiKey).toBeUndefined();
  });

  it("outros 'Nothing to do' when selection is empty", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);
    vi.mocked(selectResearchers).mockResolvedValue([]);

    await fromCrf(baseOpts);

    expect(processRow).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith("Nothing to do");
  });
});
