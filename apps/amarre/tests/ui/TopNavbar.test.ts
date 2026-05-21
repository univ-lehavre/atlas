// Level-1 UI test : top navbar reflects request state.
//
// TopNavbar shows nav items for "Compléter" and "Suivre" conditionally
// on hasIncompleteRequests / hasRequestsInProgress (true → tab visible).
// The "Déposer", "Retrouver" and "Administrer" tabs are always there.

import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import TopNavbar from '@univ-lehavre/atlas-ui/TopNavbar.svelte';

describe('TopNavbar.svelte', () => {
  it('hides the "Compléter" tab when there are no incomplete requests', () => {
    render(TopNavbar, { hasIncompleteRequests: false, hasRequestsInProgress: false });
    expect(screen.queryByRole('link', { name: /compléter/i })).toBeNull();
  });

  it('shows the "Compléter" tab when hasIncompleteRequests is true', () => {
    render(TopNavbar, { hasIncompleteRequests: true, hasRequestsInProgress: false });
    expect(screen.getByRole('link', { name: /compléter/i })).toBeInTheDocument();
  });

  it('hides the "Suivre" tab when there are no in-progress requests', () => {
    render(TopNavbar, { hasIncompleteRequests: false, hasRequestsInProgress: false });
    expect(screen.queryByRole('link', { name: /suivre/i })).toBeNull();
  });

  it('shows the "Suivre" tab when hasRequestsInProgress is true', () => {
    render(TopNavbar, { hasIncompleteRequests: false, hasRequestsInProgress: true });
    expect(screen.getByRole('link', { name: /suivre/i })).toBeInTheDocument();
  });

  it('always shows the persistent tabs (Déposer, Retrouver, Administrer)', () => {
    render(TopNavbar, { hasIncompleteRequests: false, hasRequestsInProgress: false });
    expect(screen.getByRole('link', { name: /déposer/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retrouver/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /administrer/i })).toBeInTheDocument();
  });

  it('shows both conditional tabs when both flags are true', () => {
    render(TopNavbar, { hasIncompleteRequests: true, hasRequestsInProgress: true });
    expect(screen.getByRole('link', { name: /compléter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /suivre/i })).toBeInTheDocument();
  });
});
