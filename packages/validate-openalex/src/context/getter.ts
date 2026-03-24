import { Effect, Ref } from "effect";
import { ContextStore } from "../store/index.js";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";
import type { IContext } from "./types.js";

const getContext = (): Effect.Effect<IContext, never, ContextStore> =>
  Effect.gen(function* () {
    const store = yield* ContextStore;
    const context: IContext = yield* Ref.get(store);
    return context;
  });

const isAuthorContext = (): Effect.Effect<boolean, never, ContextStore> =>
  Effect.gen(function* () {
    const { type }: IContext = yield* getContext();
    return type === "author";
  });

const getORCID = (): Effect.Effect<ORCID, Error, ContextStore> =>
  Effect.gen(function* () {
    const { type, id }: IContext = yield* getContext();
    if (type !== "author") throw new Error("Context type is not author");
    if (!id) throw new Error("No ORCID in context");
    return id;
  });

export { getContext, getORCID, isAuthorContext };
