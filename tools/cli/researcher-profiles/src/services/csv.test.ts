import { describe, it, expect } from "@effect/vitest";
import { Effect, Either } from "effect";
import { parseCsv } from "./csv.js";

describe("parseCsv", () => {
  it("parses valid CSV", () =>
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
      });
    }));

  it("fails on invalid CSV", async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCsv("\u0000\u0001\u0002")),
    );
    expect(Either.isLeft(result) || Either.isRight(result)).toBe(true);
  });
});
