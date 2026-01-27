/**
 * Homepage content - English.
 */

import { brand } from '$lib/content/locales/en/brand';
import type { HomeContent } from '$lib/content/types';

/**
 * English content for the homepage.
 */
export const en: HomeContent = {
  meta: {
    title: `${brand.appName} | Find the right talent for your projects`,
    description:
      'Connect with qualified professionals, researchers, and experts. Build your team and bring your ideas to life.',
  },
  hero: {
    title: 'Find the right talent for your projects',
    subtitle:
      'Connect with qualified professionals, researchers, and experts. Build your team and bring your ideas to life.',
    ctaLoggedIn: 'Dashboard',
    ctaLoggedOut: 'Get started',
    learnMore: 'Learn more',
  },
  howItWorks: {
    title: 'How it works',
    subtitle: `Getting started with ${brand.appName} is simple. Follow these three steps to find your next collaborator.`,
    steps: [
      {
        number: '1',
        title: 'Create your profile',
        description: 'Sign up and describe your skills, expertise, and research interests',
      },
      {
        number: '2',
        title: 'Discover talents',
        description: 'Browse the directory to find collaborators matching your project needs',
      },
      {
        number: '3',
        title: 'Connect and collaborate',
        description: 'Reach out directly and start working together on innovative projects',
      },
    ],
  },
  challenges: {
    title: `Why we created ${brand.appName}`,
    subtitle:
      'Finding the right collaborators in academia and research remains a challenge. Here is what we solve.',
    items: [
      {
        title: 'Scattered information',
        problem:
          'Researcher profiles are scattered across LinkedIn, ResearchGate, university pages, and personal websites.',
        solution: `${brand.appName} centralizes expertise in a single, searchable directory.`,
      },
      {
        title: 'Limited discovery',
        problem:
          'Finding collaborators often relies on word-of-mouth or conferences, missing potential matches.',
        solution:
          'Our platform enables discovery based on skills, research interests, and availability.',
      },
      {
        title: 'Cross-border barriers',
        problem: 'International collaboration within university alliances lacks dedicated tools.',
        solution: `Built for ${brand.eunicoast}, ${brand.appName} connects talents across partner institutions.`,
      },
    ],
  },
  cta: {
    title: 'Ready to find your next collaborator?',
    subtitle:
      'Join our platform today and start connecting with talented professionals from around the world.',
    buttonLoggedIn: 'Go to dashboard',
    buttonLoggedOut: 'Explore the directory',
  },
};
