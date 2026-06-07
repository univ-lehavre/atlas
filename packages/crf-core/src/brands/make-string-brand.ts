/**
 * Schema-as-brand factory for pattern-validated string brands (écart E12,
 * [ADR 0047](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0047-strategie-validation-schema-zod/)).
 *
 * A single `Schema.String.pipe(Schema.pattern, Schema.brand)` is the source of
 * truth from which the type, the OpenAPI pattern, the predicate, the `Either`
 * decoder and the throwing constructor all derive — ending the former triple
 * redundancy (brand / pattern / validator declared separately).
 *
 * @module
 */

import { Schema } from 'effect';
import type { Brand, Either, ParseResult } from 'effect';

/** The derived surface of a pattern-validated string brand. */
export interface StringBrand<Tag extends string, A extends string> {
  /** The Effect `Schema` — the single source of truth. */
  readonly schema: Schema.brand<Schema.filter<typeof Schema.String>, Tag>;
  /** The validation pattern (same `RegExp` the schema enforces). */
  readonly pattern: RegExp;
  /**
   * Validate and brand a string, **throwing** `ParseError` on invalid input.
   * Drop-in replacement for the former `Brand.refined` constructor.
   */
  readonly make: (value: string) => A;
  /** Type guard narrowing a string to the branded type. */
  readonly is: (value: string) => value is A;
  /** Parse a string, returning `Either<A, ParseError>`. */
  readonly parse: (value: string) => Either.Either<A, ParseResult.ParseError>;
}

/**
 * Builds a {@link StringBrand} from a brand tag and a validation pattern.
 *
 * @param tag - The brand tag (e.g. `'RecordId'`).
 * @param pattern - The regex the value must fully match.
 * @param description - Human-readable rule, surfaced in the OpenAPI/identifier
 *   annotation.
 */
export const makeStringBrand = <Tag extends string>(
  tag: Tag,
  pattern: RegExp,
  description: string
): StringBrand<Tag, string & Brand.Brand<Tag>> => {
  const schema = Schema.String.pipe(
    Schema.pattern(pattern, { identifier: tag, description }),
    Schema.brand(tag)
  );
  type A = typeof schema.Type;
  return {
    schema,
    pattern,
    make: Schema.decodeUnknownSync(schema) as (value: string) => A,
    is: Schema.is(schema),
    parse: Schema.decodeUnknownEither(schema) as (
      value: string
    ) => Either.Either<A, ParseResult.ParseError>,
  };
};
