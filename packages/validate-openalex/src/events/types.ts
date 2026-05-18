import type { CitationID, ORCID } from "@univ-lehavre/atlas-citation-types";

type Status = "pending" | "accepted" | "rejected";

type IEntity = "author" | "institution" | "work";

type IField =
  | "id"
  | "display_name_alternatives"
  | "affiliation"
  | "work"
  | "openalexID"
  | "publication_date";

interface IEventMeta {
  createdAt: string;
  updatedAt: string;
  dataIntegrity: string;
  hasBeenExtendedAt: string | null;
  label?: string;
  status: Status;
}

interface IEventData {
  /** Source des données : CitationID */
  from: CitationID;
  /** ORCID, ROR, DOI relatif à l'entité définie */
  id: ORCID;
  entity: IEntity;
  field: IField;
  value: string;
}

interface IEvent extends IEventMeta, IEventData {}

export type { Status, IEvent, IEventMeta, IEventData, IField, IEntity };
