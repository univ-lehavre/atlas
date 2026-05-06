import process from "node:process";
import { Effect } from "effect";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CommandLineError } from "@univ-lehavre/atlas-openalex";

interface Args {
  name?: string;
}

const cmd = (): Effect.Effect<Args, CommandLineError, never> =>
  Effect.tryPromise({
    try: async () => {
      const argv = await yargs(hideBin(process.argv)).parse();
      return { name: argv["name"] as string | undefined };
    },
    catch: (cause: unknown) =>
      new CommandLineError(`Error while parsing arguments`, { cause }),
  });

export { cmd };
export type { Args };
