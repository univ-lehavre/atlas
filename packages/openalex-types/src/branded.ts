import type { Brand } from "effect";

type ORCID = string & Brand.Brand<"ORCID">;
type OpenAlexID = string & Brand.Brand<"OpenAlexID">;

export type { ORCID, OpenAlexID };
