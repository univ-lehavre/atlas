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
}));

vi.mock("../prompts/select-researchers.js", () => ({
  selectResearchers: vi.fn(),
}));

vi.mock("./process-row.js", () => ({
  processRow: vi.fn(),
}));

vi.mock("./match-row.js", () => ({
  matchRow: vi.fn(),
}));

import { outro, log } from "@clack/prompts";
import { fetchResearchers } from "@univ-lehavre/atlas-researcher-profiles";
import { selectResearchers } from "../prompts/select-researchers.js";
import { processRow } from "./process-row.js";
import { matchRow } from "./match-row.js";
import { run } from "./run.js";

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
  threshold: 0.3,
};

describe("run", () => {
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

    await expect(run(baseOpts)).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("outros early when all researchers are complete", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([row({ openalex_complete: "2" })]) as never,
    );

    await run(baseOpts);

    expect(outro).toHaveBeenCalledWith("All researchers are already complete");
    expect(selectResearchers).not.toHaveBeenCalled();
    expect(processRow).not.toHaveBeenCalled();
    expect(matchRow).not.toHaveBeenCalled();
  });

  it("runs process + match for every selected researcher and reports done", async () => {
    const r = row({ userid: "u1" });
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("ok");
    vi.mocked(matchRow).mockResolvedValue("ok");

    await run(baseOpts);

    expect(processRow).toHaveBeenCalledTimes(1);
    expect(matchRow).toHaveBeenCalledTimes(1);
    const matchCfg = vi.mocked(matchRow).mock.calls[0]?.[1] as {
      threshold: number;
    };
    expect(matchCfg.threshold).toBe(0.3);
  });

  it("forwards the batch flag to processRow", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("ok");
    vi.mocked(matchRow).mockResolvedValue("ok");

    await run({ ...baseOpts, batch: true });

    const batchArg = vi.mocked(processRow).mock.calls[0]?.[4];
    expect(batchArg).toBe(true);
  });

  it("counts an error whenever process or match returns error", async () => {
    const rows = [row({ userid: "u1" }), row({ userid: "u2" })];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rows) as never);
    vi.mocked(selectResearchers).mockResolvedValue(rows);
    vi.mocked(processRow).mockResolvedValue("error");
    vi.mocked(matchRow).mockResolvedValue("ok");

    await run(baseOpts);

    const outroMsg = vi.mocked(outro).mock.calls[0]?.[0] as string;
    expect(outroMsg).toContain("2 errors");
  });

  it("counts a row as skipped when both stages skip", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("skipped");
    vi.mocked(matchRow).mockResolvedValue("skipped");

    await run(baseOpts);

    const outroMsg = vi.mocked(outro).mock.calls[0]?.[0] as string;
    expect(outroMsg).toContain("1 skipped");
  });

  it("uses 'Nothing to do' outro when selection is empty", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([row({ userid: "u1" })]) as never,
    );
    vi.mocked(selectResearchers).mockResolvedValue([]);

    await run(baseOpts);

    expect(processRow).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith("Nothing to do");
  });

  it("does not pass apiKey to citation config when missing", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("ok");
    vi.mocked(matchRow).mockResolvedValue("ok");

    const withoutKey = { ...baseOpts };
    delete (withoutKey as { citationApiKey?: string }).citationApiKey;
    await run(withoutKey);

    const citationConfig = vi.mocked(processRow).mock.calls[0]?.[2] as {
      userAgent: string;
      apiKey?: string;
    };
    expect(citationConfig.userAgent).toBe("ua");
    expect(citationConfig.apiKey).toBeUndefined();
  });

  it("logs the chosen threshold for the user", async () => {
    const r = row();
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed([r]) as never);
    vi.mocked(selectResearchers).mockResolvedValue([r]);
    vi.mocked(processRow).mockResolvedValue("ok");
    vi.mocked(matchRow).mockResolvedValue("ok");

    await run({ ...baseOpts, threshold: 0.55 });

    const infos = vi.mocked(log.info).mock.calls.map((c) => String(c[0]));
    expect(
      infos.some((m) => m.includes("Match threshold") && m.includes("0.55")),
    ).toBe(true);
  });
});
