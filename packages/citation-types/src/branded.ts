import type { Brand } from "effect";

type ORCID = string & Brand.Brand<"ORCID">;
type CitationID = string & Brand.Brand<"CitationID">;

export type { ORCID, CitationID };
