import { describe, expect, it } from "vitest";
import { asOpenAlexID, asORCID } from "./setter.js";

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

describe("asOpenAlexID", () => {
  it("accepts valid OpenAlex work ID", () => {
    expect(() =>
      asOpenAlexID("https://openalex.org/W2741809807"),
    ).not.toThrow();
  });

  it("accepts valid OpenAlex author ID", () => {
    expect(() =>
      asOpenAlexID("https://openalex.org/A1234567890"),
    ).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => asOpenAlexID("")).toThrow();
  });

  it("rejects bare ID without base URL", () => {
    expect(() => asOpenAlexID("W2741809807")).toThrow();
  });

  it("rejects wrong base URL", () => {
    expect(() => asOpenAlexID("https://example.com/W2741809807")).toThrow();
  });

  it("rejects lowercase letter prefix", () => {
    expect(() => asOpenAlexID("https://openalex.org/w2741809807")).toThrow();
  });
});
