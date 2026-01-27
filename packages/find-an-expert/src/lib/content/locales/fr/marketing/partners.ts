/**
 * Partners section content - French.
 */

import { brand } from '$lib/content/core/brand';
import type { PartnersContent } from '$lib/content/types';

/**
 * French partners content.
 */
export const fr: PartnersContent = {
  header: {
    title: 'Nos partenaires',
    subtitle: `${brand.appName} est un sous-projet d'${brand.ecrin}, favorisant la coopération entre les chercheurs de l'${brand.ulhn}, du ${brand.cptmp}, et d'${brand.eunicoast}.`,
  },
  footer: {
    cptmpAlt: brand.cptmp,
    ulhnAlt: brand.ulhn,
    eunicoastAlt: brand.eunicoast,
  },
  ulhn: {
    title: brand.ulhn,
    description:
      "L'Université Le Havre Normandie est un établissement public français d'enseignement supérieur et de recherche comptant plus de 7 000 étudiants de 85 nationalités. Elle propose plus de 120 diplômes en Arts, Droit, Sciences Humaines et Sciences & Technologies, soutenus par 12 laboratoires de recherche.",
  },
  cptmp: {
    title: brand.cptmpShort,
    description: `Le ${brand.cptmp} est un laboratoire à ciel ouvert unique en Europe. Ce consortium interdisciplinaire réunit 12 partenaires dont le CNRS, l'INSA Rouen Normandie, l'ENSM, l'ENSA Normandie et Sciences Po.`,
    features: {
      smartCity: {
        title: 'Ville intelligente',
        description:
          "Logistique urbaine, mobilité durable, réemploi, innovation pédagogique, qualité de l'air et de l'eau",
      },
      maritime: {
        title: 'Maritime et Portuaire',
        description:
          'Cybersécurité, drones, transport à voile, plateformes de données, ingénierie financière',
      },
      energy: {
        title: 'Énergie et Industrie',
        description:
          "Transition numérique, valorisation des matériaux, nouvelles productions d'énergie",
      },
    },
  },
  eunicoast: {
    title: brand.eunicoast,
    description: `${brand.eunicoast} (European University of Islands, Ports and Coastal Territories) est une alliance de 12 établissements d'enseignement supérieur et 88 partenaires associés dans 11 pays européens, coordonnée par l'${brand.ulhn}.`,
    tags: [
      'Identités et cultures locales',
      'Économie bleue et tourisme durable',
      'Gouvernance côtière',
      'Biodiversité et santé environnementale',
      'Technologies maritimes',
    ],
  },
};
