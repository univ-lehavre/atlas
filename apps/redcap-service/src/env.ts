import { Config, Effect } from 'effect';

// Config definition
export const AppConfig = Config.all({
  port: Config.number('PORT').pipe(Config.withDefault(3000)),
  redcapApiUrl: Config.string('REDCAP_API_URL').pipe(
    Config.validate({
      message: 'Must be a valid HTTP(S) URL',
      validation: (s) => /^https?:\/\/.+/.test(s),
    })
  ),
  redcapApiToken: Config.nonEmptyString('REDCAP_API_TOKEN'),
});

export type AppConfig = Config.Config.Success<typeof AppConfig>;

// Load config synchronously
const program = Effect.gen(function* () {
  return yield* AppConfig;
});

export const loadConfig = (): AppConfig => Effect.runSync(program);

// Legacy export for backwards compatibility
export const env = loadConfig();
