/**
 * Project snapshot consumed by `QuartoProjectCard` / `ProjectsCarousel`.
 *
 * Modelled after the Quarto reports produced by the legacy ecrin notebook
 * pipeline (`~/Hub/projets/ecrin/cahier/`) : each card is a short editorial
 * teaser for a research project, with a CTA pointing at the full
 * snapshot. The carousel surfaces these to authenticated visitors as
 * inspiration before they're invited to declare their own forms.
 */
export interface ProjectSnapshot {
  /** Stable identifier used as Svelte `{#each}` key. */
  id: string;
  /** Short, scannable project title. */
  title: string;
  /** One-liner that sums up the angle / question. */
  lead: string;
  /** ~50-80 words abstract surfaced under the lead. */
  abstract: string;
  /** Discipline / theme tags (2-4 entries). */
  tags: readonly string[];
  /** ISO date for the snapshot (year is enough at the UI level). */
  date: string;
  /** URL of the full Quarto report (relative or absolute). */
  href: string;
  /** Optional cover image URL — falls back to a generated gradient when
   *  absent. */
  coverUrl?: string;
}

export type ProjectSnapshotList = readonly ProjectSnapshot[];
