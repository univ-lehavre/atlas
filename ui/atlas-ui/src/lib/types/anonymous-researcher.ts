/**
 * Public-facing researcher snapshot consumed by `AnonymousHome`.
 *
 * Only fields that a chercheur has explicitly consented to expose
 * publicly (i.e. `data_audience === "General public"` combined with
 * `identification_level === "Identifiable"`) belong here. Consumers
 * (sillage, atlas-ui stories) are responsible for filtering their
 * source records against the consent matrix before mapping into this
 * shape.
 */
export type AnonymousResearcher = {
  id: string;
  fullName: string;
  /** Absolute URL to a square portrait image (avatar). */
  photoUrl: string;
  /** Short bio surfaced on hover/focus — keep < 200 characters. */
  bio: string;
};

export type AnonymousResearcherList = readonly AnonymousResearcher[];
