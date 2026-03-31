import { describe, it, expect } from "vitest";
import type { IEvent } from "../events/types.js";
import { string2option, events2options } from "./transformer.js";

type EventWithValue = Partial<IEvent> & { value: string; label?: string };

const makeOption = (value: string, label?: string): EventWithValue => ({
  value,
  label,
});

describe("string2option", () => {
  it("wraps a string into an option object", () => {
    expect(string2option("foo")).toEqual({ value: "foo" });
  });
});

describe("events2options", () => {
  it("returns empty array for empty input", () => {
    expect(events2options([])).toHaveLength(0);
  });

  it("deduplicates events with the same value", () => {
    const events = [makeOption("foo"), makeOption("foo"), makeOption("bar")];
    const result = events2options(events);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.value)).toContain("foo");
    expect(result.map((o) => o.value)).toContain("bar");
  });

  it("sorts options by label when present", () => {
    const events = [makeOption("b", "Zebra"), makeOption("a", "Apple")];
    const result = events2options(events);
    expect(result[0].value).toBe("a");
    expect(result[1].value).toBe("b");
  });

  it("sorts options by value when no label", () => {
    const events = [makeOption("z"), makeOption("a")];
    const result = events2options(events);
    expect(result[0].value).toBe("a");
    expect(result[1].value).toBe("z");
  });
});
