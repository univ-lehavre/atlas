import { createCrfClient, CrfUrl, CrfToken, type CrfClient } from '@univ-lehavre/atlas-crf-client';
import { env } from './env.js';

export const client: CrfClient = createCrfClient({
  url: CrfUrl(env.crfApiUrl),
  token: CrfToken(env.crfApiToken),
});
