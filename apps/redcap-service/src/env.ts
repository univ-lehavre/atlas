import { Config, Effect } from 'effect';

const AppConfig = Config.all({
  port: Config.number('PORT').pipe(Config.withDefault(3000)),
  redcapApiUrl: Config.string('REDCAP_API_URL').pipe(
    Config.validate({
      message: 'Must be a valid HTTP(S) URL',
      validation: (s) => /^https?:\/\/.+/.test(s),
    })
  ),
  redcapApiToken: Config.nonEmptyString('REDCAP_API_TOKEN'),
});

type AppConfigType = Config.Config.Success<typeof AppConfig>;

export const env: AppConfigType = Effect.runSync(AppConfig);
