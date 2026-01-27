/**
 * ESLint Configuration Presets
 *
 * Presets:
 * - typescript: For TypeScript libraries (crf, net)
 * - svelte: For SvelteKit apps (strict)
 * - svelteRelaxed: For SvelteKit apps (relaxed, for imported projects)
 * - scripts: For internal scripts (redcap)
 */

export { typescript } from './typescript.js';
export { svelte } from './svelte.js';
export { svelteRelaxed } from './svelte-relaxed.js';
export { scripts } from './scripts.js';
