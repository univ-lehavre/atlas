import { describe, expect, it } from 'vitest';

import { mockProjectPool, priorityQuestionnaires } from '$lib/mocks/projects';

describe('mockProjectPool', () => {
  it('contains at least 12 projects (enough for the 3-card carousel + variety)', () => {
    expect(mockProjectPool.length).toBeGreaterThanOrEqual(12);
  });

  it('every entry has the full shape (id, title, lead, abstract, tags, date, href)', () => {
    for (const p of mockProjectPool) {
      expect(p.id).toMatch(/^proj-/);
      expect(p.title.length).toBeGreaterThan(5);
      expect(p.lead.length).toBeGreaterThan(5);
      expect(p.abstract.length).toBeGreaterThan(40);
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.href).toMatch(/^\//);
    }
  });

  it('every id is unique', () => {
    const ids = new Set(mockProjectPool.map((p) => p.id));
    expect(ids.size).toBe(mockProjectPool.length);
  });

  it('every href is unique (no two projects share a destination)', () => {
    const hrefs = new Set(mockProjectPool.map((p) => p.href));
    expect(hrefs.size).toBe(mockProjectPool.length);
  });
});

describe('priorityQuestionnaires', () => {
  it('lists exactly 4 entries (the priority instruments)', () => {
    expect(priorityQuestionnaires).toHaveLength(4);
  });

  it('only researcher_profile is currently active', () => {
    const active = priorityQuestionnaires.filter((q) => !q.disabled);
    expect(active.map((q) => q.id)).toEqual(['researcher_profile']);
  });

  it('all hrefs point at /coming-soon with a form= query (until form rendering ships)', () => {
    for (const q of priorityQuestionnaires) {
      expect(q.href).toMatch(/^\/coming-soon\?form=/);
    }
  });

  it('covers the four priority instruments by id', () => {
    expect(priorityQuestionnaires.map((q) => q.id).sort()).toEqual([
      'project_proposal',
      'publications',
      'research_questions',
      'researcher_profile',
    ]);
  });
});
