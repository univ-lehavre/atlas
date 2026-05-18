import { v5 } from "uuid";
import { Effect } from "effect";
import { TextEncoder } from "util";
import { getContext } from "../context/index.js";
import { ContextStore } from "../store/index.js";
import stringify from "json-stable-stringify";

const buildIntegrity = (
  data: unknown,
): Effect.Effect<string, never, ContextStore> =>
  Effect.gen(function* () {
    const NAMESPACE: string = (yield* getContext()).NAMESPACE;
    const str: string = stringify(data) ?? "";
    const encoder: TextEncoder = new TextEncoder();
    const encoded: Uint8Array = encoder.encode(str);
    const digest: string = v5(encoded, NAMESPACE);
    return digest;
  });

// A function that takes a string[] and returns an array with unique and sorted strings
const uniqueSorted = <T>(values: T[]): T[] => {
  if (values.length === 0) return [];
  const unique: T[] = Array.from(new Set(values));
  return unique.sort();
};

export { buildIntegrity, uniqueSorted };
