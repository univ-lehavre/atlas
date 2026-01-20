import { Schema as S } from 'effect';

const envSchema = S.Struct({
  PORT: S.optionalWith(S.NumberFromString, { default: () => 3000 }),
  REDCAP_API_URL: S.String.pipe(S.pattern(/^https?:\/\/.+/)),
  REDCAP_API_TOKEN: S.String.pipe(S.minLength(1)),
});

export const env = S.decodeUnknownSync(envSchema)(process.env);
