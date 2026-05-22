/**
 * Mock project snapshots for the authenticated homepage carousel.
 *
 * Will be replaced (phase 6+) by a server-side read of an actual
 * snapshot index (probably from services/cahier-reports/ once the
 * Quarto pipeline is wired). Until then : 12 fictive projects inspired
 * by the disciplines surfaced in the trombinoscope, shuffled in
 * `+page.server.ts` so each authenticated visit gets a different
 * trio at the top.
 *
 * Shape mirrored from `@univ-lehavre/atlas-ui` (ProjectSnapshot).
 * Inlined to avoid pulling the barrel import — see the comment in
 * `mocks/researchers.ts` for the rationale.
 */
type ProjectSnapshot = {
  id: string;
  title: string;
  lead: string;
  abstract: string;
  tags: readonly string[];
  date: string;
  href: string;
  coverUrl?: string;
};
type ProjectSnapshotList = readonly ProjectSnapshot[];

export const mockProjectPool: ProjectSnapshotList = [
  {
    id: 'proj-portspeche',
    title: 'Mutations des ports de pêche normands',
    lead: 'Chaînes logistiques entre Dieppe, Fécamp et Cherbourg',
    abstract:
      "Une enquête de terrain sur les recompositions économiques observées entre 2015 et 2023 dans trois ports normands. L'étude croise relevés statistiques, entretiens semi-directifs et cartographie des flux.",
    tags: ['Économie', 'Géographie', 'Ports'],
    date: '2024-03-12',
    href: '/coming-soon?project=portspeche',
  },
  {
    id: 'proj-micropolluants',
    title: 'Cartographie des micropolluants côtiers',
    lead: 'Sentinelles biologiques le long de la Manche orientale',
    abstract:
      'Échantillonnage saisonnier de bivalves et de poissons benthiques le long de la côte havraise. Corrélation entre pics de présence et rejets industriels documentés.',
    tags: ['Écotoxicologie', 'Littoral'],
    date: '2024-06-05',
    href: '/coming-soon?project=micropolluants',
  },
  {
    id: 'proj-chantiers',
    title: 'Mémoire ouvrière des chantiers navals',
    lead: 'Archives orales d’anciens salariés du Trait',
    abstract:
      "Constitution d'un corpus d'entretiens et de photographies sur la fin des chantiers de la basse-Seine. Le projet articule histoire industrielle, anthropologie et patrimoine matériel.",
    tags: ['Histoire', 'Patrimoine', 'Anthropologie'],
    date: '2025-01-20',
    href: '/coming-soon?project=chantiers',
  },
  {
    id: 'proj-erosion',
    title: 'Érosion accélérée des falaises de craie',
    lead: 'Cap d’Ailly à Étretat : 30 ans de recul',
    abstract:
      'Reconstitution diachronique des fronts de falaise à partir de photographies aériennes IGN. Modélisation des paramètres météo et lithologiques expliquant les bonds d’érosion.',
    tags: ['Géomorphologie', 'Climat'],
    date: '2024-09-18',
    href: '/coming-soon?project=erosion',
  },
  {
    id: 'proj-eolien',
    title: "Acceptabilité sociale de l'éolien offshore",
    lead: 'Enquête mixte autour du parc de Fécamp',
    abstract:
      "Combinaison d'une enquête par questionnaire (800 répondants) et d'entretiens auprès des associations locales. Cartographie des positions selon catégories sociales et exposition visuelle.",
    tags: ['Sociologie', 'Énergie'],
    date: '2024-11-02',
    href: '/coming-soon?project=eolien',
  },
  {
    id: 'proj-langues',
    title: 'Variation diatopique du normand maritime',
    lead: 'Corpus oral de pêcheurs retraités',
    abstract:
      "Enregistrement et transcription d'entretiens libres avec d'anciens pêcheurs des trois grands ports. Analyse lexicale des nominations d'espèces et de manœuvres.",
    tags: ['Linguistique', 'Patrimoine immatériel'],
    date: '2023-12-08',
    href: '/coming-soon?project=langues',
  },
  {
    id: 'proj-droit',
    title: 'Contentieux du droit maritime contemporain',
    lead: 'Convention de Rotterdam : dix ans après',
    abstract:
      "Recensement des affaires portées devant les tribunaux français impliquant la Convention. Analyse des points d'achoppement entre transporteurs et chargeurs.",
    tags: ['Droit', 'International'],
    date: '2025-02-14',
    href: '/coming-soon?project=droit',
  },
  {
    id: 'proj-biodiv',
    title: 'Biodiversité des estrans rocheux',
    lead: 'Suivis participatifs avec les écoles primaires',
    abstract:
      "Protocole simplifié de comptage d'espèces remarquables sur 12 sites du littoral seinomarin. Les données alimentent le SINP régional et un outil pédagogique grand public.",
    tags: ['Écologie', 'Médiation'],
    date: '2024-05-22',
    href: '/coming-soon?project=biodiv',
  },
  {
    id: 'proj-tourisme',
    title: 'Tourisme côtier : mutations post-pandémie',
    lead: 'Trois saisons (2021-2023) au prisme du big data',
    abstract:
      'Exploitation de traces numériques (réservations, mobilités) pour caractériser les nouveaux flux touristiques. Comparaison avec les indicateurs de fréquentation classique.',
    tags: ['Géographie', 'Économie'],
    date: '2024-08-30',
    href: '/coming-soon?project=tourisme',
  },
  {
    id: 'proj-matiere',
    title: 'Alliages haute performance pour l’offshore',
    lead: 'Comportement en milieu chloruré sous contrainte',
    abstract:
      "Étude expérimentale du vieillissement de trois familles d'alliages utilisés dans les structures éoliennes flottantes. Caractérisation par microscopie électronique et essais de fatigue.",
    tags: ['Matériaux', 'Énergie'],
    date: '2025-03-11',
    href: '/coming-soon?project=matiere',
  },
  {
    id: 'proj-port-numerique',
    title: 'Le port numérique : vers une plateforme régionale',
    lead: 'Interopérabilité douanière et logistique',
    abstract:
      "Cartographie des systèmes d'information actuellement en usage dans les terminaux du Havre. Spécification d'un référentiel commun pour réduire les frottements administratifs.",
    tags: ['Informatique', 'Logistique'],
    date: '2024-12-17',
    href: '/coming-soon?project=port-numerique',
  },
  {
    id: 'proj-pollutions',
    title: 'Sources diffuses de pollution azotée',
    lead: 'Bassin versant de la Lézarde, Seine-Maritime',
    abstract:
      "Caractérisation isotopique de l'azote sur 24 stations de prélèvement, du plateau agricole jusqu'à l'estuaire. Identification des contributions agricoles vs urbaines.",
    tags: ['Hydrologie', 'Agronomie'],
    date: '2023-10-04',
    href: '/coming-soon?project=pollutions',
  },
];

/**
 * Four priority instruments inviting the researcher to fill their
 * declarations. Only `researcher_profile` is currently active — the
 * three others stay disabled until the gating in phase 6 unlocks them
 * based on REDCap profile state.
 *
 * Shape mirrored from `@univ-lehavre/atlas-ui` (QuestionnaireEntry).
 */
type QuestionnaireEntry = {
  id: string;
  label: string;
  description: string;
  href: string;
  disabled?: boolean;
};
type QuestionnaireEntryList = readonly QuestionnaireEntry[];

export const priorityQuestionnaires: QuestionnaireEntryList = [
  {
    id: 'researcher_profile',
    label: 'Mon profil',
    description: 'Identité, affiliation, disciplines de recherche.',
    href: '/coming-soon?form=researcher_profile',
  },
  {
    id: 'research_questions',
    label: 'Mes questions de recherche',
    description: 'Axes de travail, hypothèses, partenariats envisagés.',
    href: '/coming-soon?form=research_questions',
    disabled: true,
  },
  {
    id: 'publications',
    label: 'Mes références',
    description: 'Publications, conférences, ORCID.',
    href: '/coming-soon?form=publications',
    disabled: true,
  },
  {
    id: 'project_proposal',
    label: 'Mon projet',
    description: 'Proposition de projet de recherche cadrée.',
    href: '/coming-soon?form=project_proposal',
    disabled: true,
  },
];
