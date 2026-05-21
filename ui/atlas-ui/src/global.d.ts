// CSS side-effect imports for the client entrypoint. SvelteKit's
// generated `.svelte-kit/ambient.d.ts` used to declare these ; now that
// atlas-ui is a plain Svelte lib (no SvelteKit shell) we declare them
// ourselves so `tsc --noEmit` accepts `import 'bootstrap/dist/.../*.css'`.
declare module "*.css";
