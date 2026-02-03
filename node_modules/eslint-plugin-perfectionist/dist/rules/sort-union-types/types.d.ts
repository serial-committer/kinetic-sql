import { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import { AllCommonOptions } from '../../types/all-common-options.js'
import { TypeOption } from '../../types/common-options.js'
/**
 * Configuration options for the sort-union-types rule.
 *
 * Controls how TypeScript union type members are sorted.
 */
export type Options = Partial<
  AllCommonOptions<TypeOption, AdditionalSortOptions, CustomGroupMatchOptions>
>[]
/**
 * Union type of all available selectors for union type members.
 *
 * Selectors categorize different kinds of TypeScript types that can appear in a
 * union, enabling fine-grained control over sorting.
 */
export type Selector = (typeof allSelectors)[number]
/** Match options for a custom group. */
interface CustomGroupMatchOptions {
  /**
   * The selector type this group matches. Determines what kind of type
   * members belong to this group.
   */
  selector?: Selector
}
type AdditionalSortOptions = object
/**
 * Array of all available selectors for union type members.
 *
 * Used for validation and configuration in the ESLint rule.
 */
export declare let allSelectors: readonly [
  'intersection',
  'conditional',
  'function',
  'operator',
  'keyword',
  'literal',
  'nullish',
  'import',
  'object',
  'named',
  'tuple',
  'union',
]
/**
 * Additional custom group match options JSON schema. Used by ESLint to validate
 * rule options at configuration time.
 */
export declare let additionalCustomGroupMatchOptionsJsonSchema: Record<
  string,
  JSONSchema4
>
export {}
