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
 * Will be replaced (phase 6) by a server-side load that reads REDCap
 * records, filters those with `data_audience === "General public"` and
 * `identification_level === "Identifiable"`, and maps them to this
 * shape.
 */
const bios = [
  'Océanographie côtière, modélisation des polluants émergents.',
  'Linguistique de corpus, variation diatopique des langues romanes.',
  'Histoire maritime contemporaine, archives portuaires.',
  'Génie côtier, érosion et défense des littoraux artificialisés.',
  'Économie portuaire, chaînes logistiques et résilience.',
  'Sociologie des publics, médiation scientifique et patrimoine.',
  'Physique des matériaux, alliages haute performance.',
  'Droit maritime, contentieux et conventions internationales.',
  'Écologie marine, biodiversité des estuaires.',
  'Géographie urbaine, mutations des villes-ports.',
  'Sciences politiques, gouvernance des espaces maritimes.',
  'Hydrodynamique, sédimentation des fleuves côtiers.',
  'Anthropologie maritime, rituels et savoirs des gens de mer.',
  'Chimie de l’environnement, traceurs isotopiques.',
  'Architecture portuaire, patrimoine industriel reconverti.',
  'Climatologie, séries longues et trajectoires littorales.',
  'Pêche durable, dynamique des stocks et politiques publiques.',
  'Robotique sous-marine, capteurs autonomes.',
  'Littérature maritime, imaginaires et récits du large.',
  'Toxicologie marine, micropolluants et organismes sentinelles.',
  'Tourisme côtier, mutations sociales et économiques.',
  'Géopolitique, conflits et coopérations maritimes.',
  'Aquaculture, élevages durables et bien-être animal.',
  'Énergies marines renouvelables, intégration territoriale.',
];

export const mockResearcherPool: AnonymousResearcherList = bios.map((bio, i) => ({
  id: `rsr-${i + 1}`,
  fullName: `Personne Fictive ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
  photoUrl: `https://i.pravatar.cc/300?u=sillage-rsr-${i + 1}`,
  bio,
}));
