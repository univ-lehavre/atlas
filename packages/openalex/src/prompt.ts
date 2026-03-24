import {
  intro,
  group,
  log,
  cancel,
  outro,
  text,
  select,
  autocompleteMultiselect,
  progress,
  groupMultiselect,
} from "@clack/prompts";
import type { Option, GroupMultiSelectOptions } from "@clack/prompts";
import process from "node:process";
import { Effect } from "effect";
import color from "picocolors";
import { PromptError } from "./errors.js";

const prepare = (title: string): void =>
  intro(`${color.bgCyan(color.black(` ${title} `))}`);

const finish = (title: string): void =>
  outro(`${color.bgGreen(color.black(` ${title} `))}`);

const onCancel = (): void => {
  cancel("Opération annulée.");
  process.exit(1);
};

const who = (
  message: string,
): Effect.Effect<{ name: string }, PromptError, never> =>
  Effect.tryPromise({
    try: () =>
      group(
        {
          name: () =>
            text({
              message,
              placeholder: "Ex: Marie Curie",
              validate(value) {
                if (value?.length === 0) return `Value is required!`;
              },
            }),
        },
        {
          onCancel,
        },
      ),
    catch: (error) =>
      new PromptError(`Impossible to set parameters`, { cause: error }),
  });

const selection = (
  message: string,
  options: Option<string>[],
): Effect.Effect<{ selection: string }, PromptError, never> =>
  Effect.tryPromise({
    try: () =>
      group(
        {
          selection: () =>
            select({
              message,
              options,
            }),
        },
        {
          onCancel,
        },
      ),
    catch: (error) =>
      new PromptError(`Impossible to set parameters`, { cause: error }),
  });

const multiple = (message: string, options: Option<string>[]) =>
  Effect.tryPromise({
    try: () =>
      group(
        {
          selection: () =>
            autocompleteMultiselect({
              message,
              options,
              placeholder: "Sélectionnez une ou plusieurs options",
              maxItems: 30,
              required: true,
            }),
        },
        {
          onCancel,
        },
      ),
    catch: (error) =>
      new PromptError(`Impossible to set parameters`, { cause: error }),
  });

const groupSelect = (opts: GroupMultiSelectOptions<string>) =>
  Effect.tryPromise({
    try: () =>
      group(
        {
          selection: () => groupMultiselect<string>(opts),
        },
        {
          onCancel,
        },
      ),
    catch: (error) =>
      new PromptError(`Impossible to set parameters`, { cause: error }),
  });

export {
  prepare,
  finish,
  who,
  multiple,
  log,
  progress,
  groupSelect,
  selection,
};
