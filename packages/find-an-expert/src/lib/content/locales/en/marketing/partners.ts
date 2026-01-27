/**
 * Partners section content - English.
 */

import { brand } from '$lib/content/locales/en/brand';
import type { PartnersContent } from '$lib/content/types';

/**
 * English partners content.
 */
export const en: PartnersContent = {
  header: {
    title: 'Our partners',
    subtitle: `${brand.appName} is a sub-project of ${brand.ecrin}, fostering cooperation between researchers from ${brand.ulhn}, ${brand.cptmp}, and ${brand.eunicoast}.`,
  },
  footer: {
    cptmpAlt: brand.cptmp,
    ulhnAlt: brand.ulhn,
    eunicoastAlt: brand.eunicoast,
  },
  ulhn: {
    title: brand.ulhn,
    description:
      'Université Le Havre Normandie is a French public institution of higher education and research with more than 7,000 students from 85 nationalities. It offers over 120 degrees in Arts, Law, Humanities, and Science & Technology, supported by 12 research laboratories.',
  },
  cptmp: {
    title: brand.cptmpShort,
    description: `The ${brand.cptmp} is a unique open-air laboratory in Europe. This interdisciplinary consortium brings together 12 partners including CNRS, INSA Rouen Normandie, ENSM, ENSA Normandie, and Sciences Po.`,
    features: {
      smartCity: {
        title: 'Smart City',
        description:
          'Urban logistics, sustainable mobility, reuse, educational innovation, air and water quality',
      },
      maritime: {
        title: 'Maritime and Port',
        description: 'Cybersecurity, drones, sail transport, data platforms, financial engineering',
      },
      energy: {
        title: 'Energy and Industry',
        description: 'Digital transition, material valorization, new energy production',
      },
    },
  },
  eunicoast: {
    title: brand.eunicoast,
    description: `${brand.eunicoast} (European University of Islands, Ports and Coastal Territories) is an alliance of 12 higher education institutions and 88 associated partners in 11 European countries, coordinated by ${brand.ulhn}.`,
    tags: [
      'Local identities and cultures',
      'Blue economy and sustainable tourism',
      'Coastal governance',
      'Biodiversity and environmental health',
      'Maritime technologies',
    ],
  },
};
