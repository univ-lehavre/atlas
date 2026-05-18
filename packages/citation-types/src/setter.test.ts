import { describe, expect, it } from "vitest";
import { asCitationID, asORCID } from "./setter.js";

describe("asORCID", () => {
  it("accepts bare ORCID format", () => {
    expect(() => asORCID("0000-0001-2345-6789")).not.toThrow();
  });

  it("accepts full URI format", () => {
    expect(() =>
      asORCID("https://orcid.org/0000-0001-2345-6789"),
    ).not.toThrow();
  });

  it("accepts ORCID ending with X", () => {
    expect(() => asORCID("0000-0001-2345-678X")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => asORCID("")).toThrow();
  });

  it("rejects malformed ORCID", () => {
    expect(() => asORCID("not-an-orcid")).toThrow();
  });

  it("rejects wrong segment count", () => {
    expect(() => asORCID("0000-0001-2345")).toThrow();
  });
});

describe("asCitationID", () => {
  it("accepts valid OpenAlex work ID", () => {
    expect(() =>
      asCitationID("https://openalex.org/W2741809807"),
    ).not.toThrow();
  });

  it("accepts valid OpenAlex author ID", () => {
    expect(() =>
      asCitationID("https://openalex.org/A1234567890"),
    ).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => asCitationID("")).toThrow();
  });

  it("rejects bare ID without base URL", () => {
    expect(() => asCitationID("W2741809807")).toThrow();
  });

  it("rejects wrong base URL", () => {
    expect(() => asCitationID("https://example.com/W2741809807")).toThrow();
  });

  it("rejects lowercase letter prefix", () => {
    expect(() => asCitationID("https://openalex.org/w2741809807")).toThrow();
  });
});
