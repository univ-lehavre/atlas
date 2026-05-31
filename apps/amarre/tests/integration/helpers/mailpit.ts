// Mailpit helper for level-4 integration tests. Mailpit is the SMTP
// sink the amarre-sandbox runs alongside Appwrite — every magic-link
// email Appwrite issues lands here.

const MAILPIT_BASE_URL = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

interface MailpitSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

interface MailpitMessage {
  HTML: string;
  Text: string;
}

/**
 * Bounded ping on the Mailpit API. Returns true when the service is
 * reachable. Used as a skip predicate at the top of the auth suite.
 */
export const isMailpitReachable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${MAILPIT_BASE_URL}/api/v1/messages?limit=1`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Polls Mailpit for an inbound message addressed to the given recipient.
 * Returns the message body (HTML + Text) on first hit. Times out after
 * `timeoutMs` (default 30s — Appwrite's worker-mails has its own
 * dispatch lag, especially right after boot).
 */
export const pollForMessage = async (
  recipient: string,
  timeoutMs = 30_000
): Promise<MailpitMessage | null> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const listRes = await fetch(`${MAILPIT_BASE_URL}/api/v1/messages?limit=50`);
    if (listRes.ok) {
      const list = (await listRes.json()) as { messages?: MailpitSummary[] };
      const match = (list.messages ?? []).find((m) =>
        m.To.some((addr) => addr.Address.toLowerCase() === recipient.toLowerCase())
      );
      if (match) {
        const msgRes = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${match.ID}`);
        if (msgRes.ok) {
          return (await msgRes.json()) as MailpitMessage;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
};

/**
 * Extracts the `userId` and `secret` query params from a magic-link
 * email body. Appwrite formats the URL as `<loginUrl>/login?userId=…
 * &secret=…&expire=…` ; the `&` is HTML-escaped to `&amp;` in the HTML
 * body, which is why we accept both before splitting.
 */
export const extractMagicLinkParams = (
  body: MailpitMessage
): { userId: string; secret: string } | null => {
  const content = `${body.HTML}\n${body.Text}`;
  // Match a URL with userId + secret in any order, &amp;-tolerant.
  const linkMatch = content.match(/https?:\/\/[^\s"'<]+(?:userId|secret)=[^\s"'<]+/i);
  if (!linkMatch) return null;
  const url = linkMatch[0].replaceAll('&amp;', '&');
  try {
    const parsed = new URL(url);
    const userId = parsed.searchParams.get('userId');
    const secret = parsed.searchParams.get('secret');
    if (!userId || !secret) return null;
    return { userId, secret };
  } catch {
    return null;
  }
};

/**
 * Purges all messages from Mailpit. Used as a beforeEach/afterAll hook
 * so suites don't see leftover emails between runs.
 */
export const purgeMailpit = async (): Promise<void> => {
  await fetch(`${MAILPIT_BASE_URL}/api/v1/messages`, { method: 'DELETE' });
};
