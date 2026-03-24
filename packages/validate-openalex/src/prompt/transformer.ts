import { type Option } from "@clack/prompts";
import type { Action } from "../actions/types.js";
import type { IEvent } from "../events/types.js";

const action2option = (action: Action): Option<string> => ({
  value: action.name,
});

const event2option = (
  event: Partial<IEvent> & { value: string; label?: string },
): Option<string> => ({
  value: event.value,
  label: event.label,
});

type EventWithValue = Partial<IEvent> & { value: string };

const filterUniqueValues = (events: EventWithValue[]): EventWithValue[] => {
  const seen = new Set<string>();
  const uniques = [];
  for (const event of events) {
    if (seen.has(event.value)) continue;
    seen.add(event.value);
    uniques.push(event);
  }
  return uniques;
};

const sortOptions = (
  a: { label?: string; value: string },
  b: { label?: string; value: string },
): number =>
  a.label && b.label
    ? a.label.localeCompare(b.label)
    : a.value.localeCompare(b.value);

/**
 * Converts a list of events to options for prompts.
 * @param events List of events to convert
 * @returns Sorted options (by label or value) without duplicates
 */
const events2options = (
  events: (Partial<IEvent> & { value: string; label?: string })[],
): Option<string>[] => {
  const uniques = filterUniqueValues(events);
  const options = uniques.map(event2option).sort(sortOptions);
  return options;
};

const string2option = (value: string): Option<string> => ({ value });

const strings2options = (strings: string[]): Option<string>[] =>
  strings.map(string2option);

export { strings2options, string2option, action2option, events2options };
