import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import AnonymousHome from '@univ-lehavre/atlas-ui/AnonymousHome.svelte';

const makeResearchers = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `rsr-${i + 1}`,
    fullName: `Fictive ${i + 1}`,
    photoUrl: `https://i.pravatar.cc/300?u=test-${i + 1}`,
    bio: `Bio fictive ${i + 1}.`,
  }));

afterEach(cleanup);

describe('<AnonymousHome>', () => {
  it('renders 8 portraits and one Meet-the-community tile when pool ≥ 8', () => {
    const { container } = render(AnonymousHome, {
      signupUrl: '/signup',
      researchers: makeResearchers(24),
    });
    expect(container.querySelectorAll('li.portrait')).toHaveLength(8);
    expect(container.querySelectorAll('li.discover')).toHaveLength(1);
    expect(container.textContent).toContain('Meet the community');
  });

  it('still renders the discover tile when the pool has < 5 entries', () => {
    const { container } = render(AnonymousHome, {
      signupUrl: '/signup',
      researchers: makeResearchers(3),
    });
    expect(container.querySelectorAll('li.portrait')).toHaveLength(3);
    expect(container.querySelectorAll('li.discover')).toHaveLength(1);
  });

  it('discover tile links to signupUrl by default', () => {
    const { container } = render(AnonymousHome, {
      signupUrl: '/custom-signup',
      researchers: makeResearchers(8),
    });
    const link = container.querySelector('li.discover a');
    expect(link?.getAttribute('href')).toBe('/custom-signup');
  });

  it('renders a button (no href) and calls onSignupClick when provided', async () => {
    const onSignupClick = vi.fn();
    const { container } = render(AnonymousHome, {
      signupUrl: '/signup',
      researchers: makeResearchers(8),
      onSignupClick,
    });
    // No <a href> when the callback is wired — prevents the default
    // navigation Playwright was hitting before hydration finished.
    expect(container.querySelector('li.discover a')).toBeNull();
    const button = container.querySelector('li.discover button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    await fireEvent.click(button);
    expect(onSignupClick).toHaveBeenCalledTimes(1);
  });

  it('researcher portraits expose alt text from fullName', () => {
    const { container } = render(AnonymousHome, {
      signupUrl: '/signup',
      researchers: makeResearchers(8),
    });
    const firstImg = container.querySelector('li.portrait img') as HTMLImageElement | null;
    expect(firstImg?.alt).toMatch(/Portrait de Fictive 1/);
  });
});
