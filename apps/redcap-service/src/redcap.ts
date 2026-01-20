import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
  type RedcapClient,
} from '@univ-lehavre/atlas-redcap-api';
import { env } from './env.js';

export const redcap: RedcapClient = createRedcapClient({
  url: RedcapUrl(env.REDCAP_API_URL),
  token: RedcapToken(env.REDCAP_API_TOKEN),
});
