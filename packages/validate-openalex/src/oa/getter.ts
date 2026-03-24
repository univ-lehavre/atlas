import type {
  AuthorshipInstitution,
  OpenAlexID,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import { Either } from "effect";

export const getAffiliationLabel = (
  affiliation: WorksResult,
  id: OpenAlexID,
): Either.Either<string, Error> => {
  const affiliationFound: AuthorshipInstitution | undefined =
    affiliation.authorships
      .map((a) => a.institutions)
      .flat()
      .find((aff) => aff.id === id);
  return affiliationFound
    ? Either.right(affiliationFound.display_name)
    : Either.left(new Error("Affiliation not found"));
};
