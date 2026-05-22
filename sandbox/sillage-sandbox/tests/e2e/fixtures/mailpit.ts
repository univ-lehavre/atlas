// Mailpit helpers for the level-5 smoke. Same shape as the level-4
// helpers in `apps/sillage/tests/integration/helpers/mailpit.ts` ; kept
// local here so the sandbox doesn't reach into sillage's tests tree.

const MAILPIT_URL = process.env["MAILPIT_URL"] ?? "http://localhost:8025";

interface MailpitSummary {
  ID: string;
  To: Array<{ Address: string }>;
}

interface MailpitMessage {
  HTML: string;
  Text: string;
}

export const purgeMailpit = async (): Promise<void> => {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" }).catch(
    () => undefined,
  );
};

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Polls Mailpit until a magic-link email addressed to `recipient`
 * shows up, then returns its full login URL (e.g.
 * `http://localhost:5173/login?userId=...&secret=...&expire=...`).
 * `&amp;` entities in the HTML body are decoded so the URL is directly
 * usable as `page.goto(url)`.
 */
export const waitForMagicLink = async (
  recipient: string,
  timeoutMs = 30_000,
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (list.ok) {
      const summary = (await list.json()) as { messages?: MailpitSummary[] };
      const match = (summary.messages ?? []).find((m) =>
        m.To.some((a) => a.Address.toLowerCase() === recipient.toLowerCase()),
      );
      if (match) {
        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        if (!detail.ok) {
          throw new Error(`Mailpit fetch failed HTTP ${detail.status}`);
        }
        const msg = (await detail.json()) as MailpitMessage;
        const body = (msg.HTML || msg.Text).replace(/&amp;/g, "&");
        const url = body.match(
          /https?:\/\/[^\s"'<>]*\/login\?[^\s"'<>]*userId=[^\s"'<>]+/,
        );
        if (!url) throw new Error("Magic link URL not found in email body");
        return url[0];
      }
    }
    await sleep(500);
  }
  throw new Error(
    `Magic-link for ${recipient} did not arrive in ${timeoutMs}ms`,
  );
};

export const extractUserId = (loginUrl: string): string => {
  const match = loginUrl.match(/userId=([A-Za-z0-9._-]+)/);
  if (!match) throw new Error(`Could not extract userId from ${loginUrl}`);
  return match[1]!;
};
