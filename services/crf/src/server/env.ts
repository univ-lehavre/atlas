import { Config, Effect } from 'effect';

const AppConfig = Config.all({
  port: Config.number('PORT').pipe(Config.withDefault(3000)),
  crfApiUrl: Config.string('REDCAP_API_URL').pipe(
    Config.validate({
      message: 'Must be a valid HTTP(S) URL',
      validation: (s) => /^https?:\/\/.+/.test(s),
    })
  ),
  crfApiToken: Config.nonEmptyString('REDCAP_API_TOKEN'),
  // Static Bearer secret guarding /api/* (ADR 0041). Required: the service
  // exposes nominative data and must not start unauthenticated (fail-closed).
  authToken: Config.nonEmptyString('CRF_AUTH_TOKEN'),
  disableRateLimit: Config.boolean('DISABLE_RATE_LIMIT').pipe(Config.withDefault(false)),
});

type AppConfigType = Config.Config.Success<typeof AppConfig>;

export const env: AppConfigType = Effect.runSync(AppConfig);
