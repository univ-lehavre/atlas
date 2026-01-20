import { createRedcapClient, type RedcapClient } from '@univ-lehavre/atlas-redcap-api';
import { env } from './env.js';

export const redcap: RedcapClient = createRedcapClient({
  url: env.REDCAP_API_URL,
  token: env.REDCAP_API_TOKEN,
});
