#!/usr/bin/env node
/**
 * REDCap CLI Entry Point
 */

import { NodeContext, NodeHttpClient, NodeRuntime } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import { runCli } from './cli.js';
import { RedcapServiceConfigTag, RedcapServiceLive } from './services.js';

const DEFAULT_URL = 'http://localhost:3000';

/** Parse the URL from command line arguments */
const getUrlFromArgs = (args: readonly string[]): string => {
  const urlIndex = args.findIndex((arg) => arg === '--url' || arg === '-u');
  const nextArg = urlIndex !== -1 ? args[urlIndex + 1] : undefined;
  return nextArg ?? DEFAULT_URL;
};

const main = Effect.gen(function* () {
  const args = process.argv;
  const baseUrl = getUrlFromArgs(args);

  const ConfigLayer = Layer.succeed(RedcapServiceConfigTag, { baseUrl });
  const HttpLayer = NodeHttpClient.layer;
  const ServiceLayer = Layer.provide(RedcapServiceLive, Layer.merge(ConfigLayer, HttpLayer));

  yield* runCli(args).pipe(Effect.provide(ServiceLayer), Effect.provide(NodeContext.layer));
});

main.pipe(
  Effect.catchAllCause(() => Effect.void),
  NodeRuntime.runMain
);
