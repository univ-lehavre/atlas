// Root-level ESLint flat config. Workspaces each ship their own
// `eslint.config.js` ; this file catches the handful of standalone
// files at the repo root (commitlint.config.js, prettier.config.*)
// so `pnpm exec eslint <file>` invoked by the lefthook lint hook
// doesn't bomb with "no config found" when those files are staged.
// Workspaces are excluded so their own configs win for their own files.
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.svelte-kit/**",
      "**/build/**",
      "**/coverage/**",
      "apps/**",
      "cli/**",
      "config/**",
      "packages/**",
      "sandbox/**",
      "services/**",
      "ui/**",
      "tools/**",
    ],
  },
  {
    files: ["*.{js,mjs,cjs}"],
    rules: {},
  },
];
