import type { GithubRelease } from "./types.js";

const REPO = "univ-lehavre/atlas";
const BASE = "https://api.github.com";

export const fetchReleases = (token: string): Promise<GithubRelease[]> => {
  const url = `${BASE}/repos/${REPO}/releases?per_page=100`;
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }).then(async (res) => {
    if (res.ok) {
      return (
        res.json() as Promise<{ tag_name: string; published_at: string }[]>
      ).then((raw) =>
        raw.map(({ tag_name, published_at }) => ({ tag_name, published_at })),
      );
    }
    const t = await res.text();
    throw new Error(`GitHub API ${String(res.status)}: ${t}`);
  });
};
