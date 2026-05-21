// Bootstrap ships its UMD bundle without types ; we dynamic-import it
// from `+layout.svelte` for its side effects only (no API consumption).
// `app.d.ts` contains an `export {}` that turns it into a module — a
// `declare module 'X'` there would augment, not declare ambient. This
// stub file has no exports so the declaration is taken as ambient.
declare module 'bootstrap/dist/js/bootstrap.bundle.min.js';
