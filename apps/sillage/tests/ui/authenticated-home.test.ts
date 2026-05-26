import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import AuthenticatedHome from '@univ-lehavre/atlas-ui/AuthenticatedHome.svelte';

afterEach(cleanup);

const projects = Array.from({ length: 5 }, (_, i) => ({
  id: `p-${i + 1}`,
  title: `Projet fictif ${i + 1}`,
  lead: `Lead fictif ${i + 1}`,
  abstract:
    'Une abstract fictive qui dépasse les quarante caractères de la validation unitaire pour rester réaliste.',
  tags: ['Tag1', 'Tag2'] as const,
  date: '2024-06-01',
  href: `/p-${i + 1}`,
}));

const questionnaires = [
  {
    id: 'researcher_profile',
    label: 'Mon profil',
    description: 'Identité.',
    href: '/coming-soon?form=researcher_profile',
  },
  {
    id: 'research_questions',
    label: 'Mes questions',
    description: 'Axes.',
    href: '/coming-soon?form=research_questions',
    disabled: true,
  },
];

describe('<AuthenticatedHome>', () => {
  it('renders the welcome heading with greetingName when provided', () => {
    const { container } = render(AuthenticatedHome, {
      greetingName: 'Fictional Person',
      projects,
      questionnaires,
    });
    const heading = container.querySelector('.welcome h1');
    expect(heading?.textContent).toContain('Welcome');
    expect(heading?.textContent).toContain('Fictional Person');
  });

  it('renders the welcome heading without name when greetingName is absent', () => {
    const { container } = render(AuthenticatedHome, {
      projects,
      questionnaires,
    });
    const heading = container.querySelector('.welcome h1');
    expect(heading?.textContent).toContain('Welcome');
    expect(heading?.querySelector('span')).toBeNull();
  });

  it('renders exactly 3 project cards from a pool of 5', () => {
    const { container } = render(AuthenticatedHome, {
      greetingName: 'Test',
      projects,
      questionnaires,
    });
    // Projects carousel renders one .project-card per visible project.
    expect(container.querySelectorAll('.project-card')).toHaveLength(3);
  });

  it('renders one card per questionnaire entry', () => {
    const { container } = render(AuthenticatedHome, {
      greetingName: 'Test',
      projects,
      questionnaires,
    });
    // Active entries render an <a class="invite-link">, disabled ones a div.
    const activeCtas = container.querySelectorAll(
      'section[aria-label="Your contribution"] a.invite-link'
    );
    expect(activeCtas).toHaveLength(1);
    // Disabled entries are listed but rendered as a non-clickable div.
    const allCards = container.querySelectorAll('section[aria-label="Your contribution"] li .card');
    expect(allCards).toHaveLength(questionnaires.length);
  });
});
