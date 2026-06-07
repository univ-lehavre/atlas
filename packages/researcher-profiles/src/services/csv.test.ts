import { describe, it, expect } from "@effect/vitest";
import { Effect, Either } from "effect";
import { CsvParseError } from "../errors.js";
import { parseCsv, toRow, cellOrEmpty } from "./csv.js";

describe("cellOrEmpty", () => {
  it("returns the value when defined", () => {
    expect(cellOrEmpty("hello")).toBe("hello");
  });

  it("returns an empty string when value is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- exercises the `?? ""` path
    expect(cellOrEmpty(undefined)).toBe("");
  });
});

describe("toRow", () => {
  it("fills missing columns with empty strings", () => {
    expect(toRow({ userid: "u1" })).toEqual({
      userid: "u1",
      last_name: "",
      middle_name: "",
      first_name: "",
      orcid: "",
      oa_imported_at: "",
      oa_locked_at: "",
      openalex_complete: "",
    });
  });

  it("preserves all provided columns", () => {
    const record = {
      userid: "u1",
      last_name: "Doe",
      middle_name: "B",
      first_name: "Alice",
      orcid: "0000",
      oa_imported_at: "ts",
      oa_locked_at: "ts2",
      openalex_complete: "2",
    };
    expect(toRow(record)).toEqual(record);
  });
});

describe("parseCsv", () => {
  it.effect("parses valid CSV", () =>
    Effect.gen(function* () {
      const content = `userid,last_name,middle_name,first_name,orcid
u001,Dupont,,Jean,0000-0001-2345-6789
u002,Martin,Louis,Pierre,`;
      const rows = yield* parseCsv(content);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        userid: "u001",
        last_name: "Dupont",
        middle_name: "",
        first_name: "Jean",
        orcid: "0000-0001-2345-6789",
      });
      expect(rows[1]).toMatchObject({
        userid: "u002",
        middle_name: "Louis",
        orcid: "",
        oa_imported_at: "",
        oa_locked_at: "",
        openalex_complete: "",
      });
    }),
  );

  it.effect("keeps optional REDCap workflow fields when present", () =>
    Effect.gen(function* () {
      const content = `userid,last_name,middle_name,first_name,orcid,oa_imported_at,oa_locked_at,openalex_complete
u001,Dupont,,Jean,0000-0001-2345-6789,2026-03-18 10:18:00,,2`;
      const rows = yield* parseCsv(content);
      expect(rows[0]).toMatchObject({
        oa_imported_at: "2026-03-18 10:18:00",
        oa_locked_at: "",
        openalex_complete: "2",
      });
    }),
  );

  it.effect("returns an empty array when the CSV has only a header", () =>
    Effect.gen(function* () {
      const content = `userid,last_name,middle_name,first_name,orcid`;
      const rows = yield* parseCsv(content);
      expect(rows).toEqual([]);
    }),
  );

  it("fails when required columns are missing", async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCsv("userid,last_name\nu001,Dupont")),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(CsvParseError);
      expect(String(result.left.cause)).toContain(
        "Missing required CSV columns",
      );
    }
  });

  it("fails on malformed CSV", async () => {
    const result = await Effect.runPromise(
      Effect.either(
        parseCsv('userid,last_name,middle_name,first_name,orcid\n"u001'),
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
  });
});
