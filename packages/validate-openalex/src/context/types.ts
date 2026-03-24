import type { ORCID } from "@univ-lehavre/atlas-openalex-types";
import type { IEntity } from "../events/types.js";

type IContextType = IEntity | "none";

interface IContext {
  type: IContextType;
  // Description
  id: ORCID | undefined;
  // Stockage du contexte et des évènements
  backup: boolean;
  NAMESPACE: string;
}

export type { IContext, IContextType };
