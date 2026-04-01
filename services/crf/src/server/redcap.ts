import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
  type RedcapClient,
} from '@univ-lehavre/atlas-redcap-client';
import { env } from './env.js';

export const redcap: RedcapClient = createRedcapClient({
  url: RedcapUrl(env.redcapApiUrl),
  token: RedcapToken(env.redcapApiToken),
});
