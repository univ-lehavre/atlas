// Stub for `$app/paths` used by components when rendered in Storybook.
// The real implementation comes from SvelteKit at runtime ; here we just
// pass the path through so the components render visually.
export const resolve = <T>(path: T): T => path;
export const base = "";
export const assets = "";
