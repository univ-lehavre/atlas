// Level-1 UI test : conditional sections #complete and #follow.
//
// +page.svelte slices `data.requests` into two groups and only mounts
// the matching <Complete /> / <Follow /> section if the group is non-empty.
// We cover (a) the JS slicing logic against every relevant input shape
// and (b) the components rendering against every request-count shape.

import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import Complete from '$lib/ui/Complete.svelte';
import Follow from '$lib/ui/Follow.svelte';
import type { SurveyRequestItem } from '$lib/types/api/surveys';
import {
  noRequests,
  oneIncompleteRequest,
  oneInProgressRequest,
  mixedRequests,
} from '../fixtures/requests';

// Mirrors the derivation in apps/amarre/src/routes/+page.svelte.
const slice = (
  requests: SurveyRequestItem[]
): { incomplete: SurveyRequestItem[]; inProgress: SurveyRequestItem[] } => ({
  incomplete: requests.filter((r) => r.validation_finale_complete !== '2'),
  inProgress: requests.filter((r) => r.validation_finale_complete === '2'),
});

describe('+page slicing : (incomplete vs in-progress)', () => {
  it('empty list yields empty incomplete + empty inProgress', () => {
    const { incomplete, inProgress } = slice(noRequests);
    expect(incomplete).toHaveLength(0);
    expect(inProgress).toHaveLength(0);
  });

  it('one incomplete-only request → incomplete=[1], inProgress=[]', () => {
    const { incomplete, inProgress } = slice(oneIncompleteRequest);
    expect(incomplete).toHaveLength(1);
    expect(inProgress).toHaveLength(0);
  });

  it('one in-progress-only request → incomplete=[], inProgress=[1]', () => {
    const { incomplete, inProgress } = slice(oneInProgressRequest);
    expect(incomplete).toHaveLength(0);
    expect(inProgress).toHaveLength(1);
  });

  it('mixed list → incomplete=2 (validation_finale_complete !== "2"), inProgress=1', () => {
    const { incomplete, inProgress } = slice(mixedRequests);
    expect(incomplete).toHaveLength(2);
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0]!.record_id).toBe('progress-001');
  });

  it.each([
    ['0', true],
    ['1', true],
    ['2', false],
    ['', true], // any other value → considered incomplete by the !== '2' filter
  ])('validation_finale_complete=%j → counted as incomplete: %s', (value, expectIncomplete) => {
    const r: SurveyRequestItem = { ...oneIncompleteRequest[0]!, validation_finale_complete: value };
    const { incomplete, inProgress } = slice([r]);
    expect(incomplete.length === 1).toBe(expectIncomplete);
    expect(inProgress.length === 1).toBe(!expectIncomplete);
  });
});

describe('Complete.svelte (incomplete requests section)', () => {
  it('renders the #complete scaffold and the "Compléter" heading even with no requests', () => {
    const { container } = render(Complete, { requests: noRequests });
    expect(container.querySelector('#complete')).not.toBeNull();
    expect(screen.getAllByText(/compléter/i).length).toBeGreaterThan(0);
  });

  it('renders one <Request /> tile per item in the array', () => {
    // Each Request component is wrapped in a `.flex-shrink-0` container
    // (cf. Complete.svelte's HorizontalScroller pattern). The SectionTile
    // also lives in a flex-shrink container, so the tile count = N + 1
    // where N is the number of requests. We assert "at least N+1".
    const tilesFor = (count: number): number => {
      const { container } = render(Complete, { requests: mixedRequests.slice(0, count) });
      return container.querySelectorAll('#complete .flex-shrink-0').length;
    };
    expect(tilesFor(0)).toBeGreaterThanOrEqual(1); // SectionTile only
    expect(tilesFor(1)).toBeGreaterThanOrEqual(2); // SectionTile + 1 Request
    expect(tilesFor(2)).toBeGreaterThanOrEqual(3); // SectionTile + 2 Requests
  });
});

describe('Follow.svelte (in-progress requests section)', () => {
  it('renders the #follow scaffold and the "Suivre" heading even with no requests', () => {
    const { container } = render(Follow, { requests: noRequests });
    expect(container.querySelector('#follow')).not.toBeNull();
    expect(screen.getAllByText(/suivre/i).length).toBeGreaterThan(0);
  });

  it('renders one <Request /> tile per item in the array', () => {
    const tilesFor = (count: number): number => {
      const { container } = render(Follow, {
        requests: count === 0 ? [] : [oneInProgressRequest[0]!],
      });
      return container.querySelectorAll('#follow .flex-shrink-0').length;
    };
    expect(tilesFor(0)).toBeGreaterThanOrEqual(1); // SectionTile only
    expect(tilesFor(1)).toBeGreaterThanOrEqual(2); // SectionTile + 1 Request
  });
});
