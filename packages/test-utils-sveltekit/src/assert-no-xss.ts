/**
 * Assert that a SvelteKit response does not reflect an attacker-controlled
 * payload in a way that could trigger XSS. Use this in endpoint tests that
 * accept arbitrary strings (search queries, names, comments…).
 *
 * The assertion is **string-based**: it serialises the response body and
 * checks that the dangerous payload (e.g. `<script>alert(1)</script>`)
 * doesn't appear verbatim. This catches the easy class of reflection bugs
 * — a real CSP and output-escaping are still required for defence in
 * depth.
 *
 * @example
 * ```ts
 * const payload = '<script>alert("xss")</script>';
 * const res = await GET(createRouteEvent({
 *   url: `https://example.com/search?q=${encodeURIComponent(payload)}`,
 * }));
 * await assertNoXss(res, payload);
 * ```
 */
export const assertNoXss = async (
  response: Response,
  payload: string,
): Promise<void> => {
  const body = await response.clone().text();
  if (body.includes(payload)) {
    throw new Error(
      `Response body reflects XSS payload verbatim:\n  payload = ${payload}\n  body excerpt = ${body.slice(0, 200)}`,
    );
  }
};

/**
 * Build a small fixture of common XSS payloads. Use with `it.each(...)` to
 * exercise every payload against the same endpoint, ensuring consistent
 * coverage across apps.
 */
export const xssPayloads = (): readonly string[] => [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  'javascript:alert("xss")',
  '"><svg onload=alert(1)>',
  "'-alert(1)-'",
];
