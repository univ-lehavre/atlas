import type { Meta, StoryObj } from "@storybook/svelte-vite";
import AuthenticatedHome from "./AuthenticatedHome.svelte";
import type { ProjectSnapshotList } from "./types/project-snapshot";
import type { QuestionnaireEntryList } from "./types/instrument";

// Storybook preview of the authenticated homepage : welcome banner +
// Quarto-flavoured projects carousel (3 cards) + invitation to fill
// the priority questionnaires.

const projects: ProjectSnapshotList = [
  {
    id: "proj-1",
    title: "Mutations des ports de pêche normands",
    lead: "Chaînes logistiques entre Dieppe, Fécamp et Cherbourg",
    abstract:
      "Une enquête de terrain sur les recompositions économiques observées entre 2015 et 2023 dans trois ports normands. L'étude croise relevés statistiques, entretiens semi-directifs et cartographie des flux.",
    tags: ["Économie", "Géographie", "Ports"],
    date: "2024-03-12",
    href: "/coming-soon?project=proj-1",
  },
  {
    id: "proj-2",
    title: "Cartographie des micropolluants côtiers",
    lead: "Sentinelles biologiques le long de la Manche orientale",
    abstract:
      "Échantillonnage saisonnier de bivalves et de poissons benthiques le long de la côte havraise. L'analyse cherche à corréler les pics de présence avec les rejets industriels documentés.",
    tags: ["Écotoxicologie", "Littoral"],
    date: "2024-06-05",
    href: "/coming-soon?project=proj-2",
  },
  {
    id: "proj-3",
    title: "Mémoire ouvrière des chantiers navals",
    lead: "Archives orales d'anciens salariés du Trait",
    abstract:
      "Constitution d'un corpus d'entretiens et de photographies sur la fin des chantiers de la basse-Seine. Le projet articule histoire industrielle, anthropologie et patrimoine matériel.",
    tags: ["Histoire", "Patrimoine", "Anthropologie"],
    date: "2025-01-20",
    href: "/coming-soon?project=proj-3",
  },
];

const questionnaires: QuestionnaireEntryList = [
  {
    id: "researcher_profile",
    label: "Mon profil",
    description: "Identité, affiliation, disciplines.",
    href: "/coming-soon?form=researcher_profile",
  },
  {
    id: "research_questions",
    label: "Mes questions de recherche",
    description: "Axes de travail, hypothèses, partenariats envisagés.",
    href: "/coming-soon?form=research_questions",
    disabled: true,
  },
  {
    id: "publications",
    label: "Mes références",
    description: "Publications, conférences, ORCID.",
    href: "/coming-soon?form=publications",
    disabled: true,
  },
  {
    id: "project_proposal",
    label: "Mon projet",
    description: "Proposition de projet de recherche cadrée.",
    href: "/coming-soon?form=project_proposal",
    disabled: true,
  },
];

const meta = {
  title: "Pages/AuthenticatedHome",
  component: AuthenticatedHome,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<AuthenticatedHome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    greetingName: "Personne Fictive",
    projects,
    questionnaires,
  },
};

export const WithoutGreetingName: Story = {
  args: {
    projects,
    questionnaires,
  },
};

export const AllQuestionnairesActive: Story = {
  args: {
    greetingName: "Personne Fictive",
    projects,
    questionnaires: questionnaires.map((q) => ({ ...q, disabled: false })),
  },
};
