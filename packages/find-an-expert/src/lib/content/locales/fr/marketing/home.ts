/**
 * Homepage content - French.
 */

import { brand } from '$lib/content/core/brand';
import type { HomeContent } from '$lib/content/types';

/**
 * French content for the homepage.
 */
export const fr: HomeContent = {
  meta: {
    title: `${brand.appName} | Trouvez les talents pour vos projets`,
    description:
      'Connectez-vous avec des professionnels qualifiés, chercheurs et experts. Constituez votre équipe et donnez vie à vos idées.',
  },
  hero: {
    title: 'Trouvez les talents adaptés à vos projets',
    subtitle:
      'Connectez-vous avec des professionnels qualifiés, chercheurs et experts. Constituez votre équipe et donnez vie à vos idées.',
    ctaLoggedIn: 'Tableau de bord',
    ctaLoggedOut: 'Commencer',
    learnMore: 'En savoir plus',
  },
  howItWorks: {
    title: 'Comment ça marche',
    subtitle: `Démarrer avec ${brand.appName} est simple. Suivez ces trois étapes pour trouver votre prochain collaborateur.`,
    steps: [
      {
        number: '1',
        title: 'Créez votre profil',
        description:
          'Inscrivez-vous et décrivez vos compétences, votre expertise et vos intérêts de recherche',
      },
      {
        number: '2',
        title: 'Découvrez les talents',
        description:
          'Parcourez le répertoire pour trouver des collaborateurs correspondant aux besoins de votre projet',
      },
      {
        number: '3',
        title: 'Connectez-vous et collaborez',
        description:
          'Contactez directement et commencez à travailler ensemble sur des projets innovants',
      },
    ],
  },
  challenges: {
    title: `Pourquoi nous avons créé ${brand.appName}`,
    subtitle:
      'Trouver les bons collaborateurs dans le monde académique et de la recherche reste un défi. Voici ce que nous résolvons.',
    items: [
      {
        title: 'Informations dispersées',
        problem:
          'Les profils des chercheurs sont éparpillés entre LinkedIn, ResearchGate, les pages universitaires et les sites personnels.',
        solution: `${brand.appName} centralise les expertises dans un répertoire unique et consultable.`,
      },
      {
        title: 'Découverte limitée',
        problem:
          'Trouver des collaborateurs repose souvent sur le bouche-à-oreille ou les conférences, manquant des correspondances potentielles.',
        solution:
          'Notre plateforme permet la découverte basée sur les compétences, les intérêts de recherche et la disponibilité.',
      },
      {
        title: 'Barrières transfrontalières',
        problem:
          "La collaboration internationale au sein des alliances universitaires manque d'outils dédiés.",
        solution: `Conçu pour ${brand.eunicoast}, ${brand.appName} connecte les talents à travers les institutions partenaires.`,
      },
    ],
  },
  cta: {
    title: 'Prêt à trouver votre prochain collaborateur ?',
    subtitle:
      "Rejoignez notre plateforme dès aujourd'hui et commencez à vous connecter avec des professionnels talentueux du monde entier.",
    buttonLoggedIn: 'Accéder au tableau de bord',
    buttonLoggedOut: 'Explorer le répertoire',
  },
};
