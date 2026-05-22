/**
 * Shape mirrored from `@univ-lehavre/atlas-ui` (AnonymousResearcher).
 * Inlined to avoid pulling the barrel export — barrel imports drag the
 * full atlas-ui graph into svelte-check, which surfaces unrelated
 * pre-existing typing issues. The Svelte compiler still cross-checks
 * the shape at the `<AnonymousHome researchers={...} />` call site.
 */
type AnonymousResearcher = {
  id: string;
  fullName: string;
  photoUrl: string;
  bio: string;
};
type AnonymousResearcherList = readonly AnonymousResearcher[];

/**
 * Pool of mock researchers backing the anonymous homepage trombinoscope.
 * `+page.server.ts` shuffles this pool at load (Fisher-Yates) so every
 * page load picks a different starting set, and the AnonymousHome
 * component rotates one tile every 5s while the page is open.
 *
 * pravatar's `?u={seed}` query yields a deterministic photo per seed
 * (verified: same `last-modified` across reloads, `cf-cache-status: HIT`),
 * so each fictional researcher keeps the same face every time they
 * appear.
 *
 * Will be replaced (later phase) by a server-side load that reads
 * REDCap records, filters those with `data_audience === "General public"`
 * and `identification_level === "Identifiable"`, and maps them to this
 * shape.
 */
const bios = [
  'Coastal oceanography, modelling of emerging pollutants.',
  'Corpus linguistics, diatopic variation in Romance languages.',
  'Contemporary maritime history, port archives.',
  'Coastal engineering, erosion and defence of engineered shorelines.',
  'Port economics, supply chains and resilience.',
  'Sociology of audiences, science communication and heritage.',
  'Materials physics, high-performance alloys.',
  'Maritime law, disputes and international conventions.',
  'Marine ecology, biodiversity of estuaries.',
  'Urban geography, transformations of port cities.',
  'Political science, governance of maritime spaces.',
  'Hydrodynamics, sedimentation of coastal rivers.',
  'Maritime anthropology, rituals and knowledge of seafarers.',
  'Environmental chemistry, isotopic tracers.',
  'Port architecture, reconverted industrial heritage.',
  'Climatology, long series and shoreline trajectories.',
  'Sustainable fisheries, stock dynamics and public policy.',
  'Underwater robotics, autonomous sensors.',
  'Maritime literature, imaginaries and tales of the open sea.',
  'Marine toxicology, micropollutants and sentinel organisms.',
  'Coastal tourism, social and economic shifts.',
  'Geopolitics, maritime conflicts and cooperation.',
  'Aquaculture, sustainable farming and animal welfare.',
  'Marine renewable energy, territorial integration.',
];

export const mockResearcherPool: AnonymousResearcherList = bios.map((bio, i) => ({
  id: `rsr-${i + 1}`,
  fullName: `Fictional Person ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
  photoUrl: `https://i.pravatar.cc/300?u=sillage-rsr-${i + 1}`,
  bio,
}));
