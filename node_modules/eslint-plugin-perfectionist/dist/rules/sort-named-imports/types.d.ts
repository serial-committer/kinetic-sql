import { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import { TSESTree } from '@typescript-eslint/types'
import { AllCommonOptions } from '../../types/all-common-options.js'
import { TypeOption } from '../../types/common-options.js'
import { SortingNode } from '../../types/sorting-node.js'
/**
 * Configuration options for the sort-named-imports rule.
 *
 * Controls how named imports are sorted within import statements.
 */
export type Options = Partial<
  {
    /**
     * Whether to ignore import aliases when sorting. When true, sorts by the
     * original name rather than the alias.
     *
     * @default false
     */
    ignoreAlias: boolean
  } & AllCommonOptions<
    TypeOption,
    AdditionalSortOptions,
    CustomGroupMatchOptions
  >
>[]
/** Extended sorting node for named import specifiers. */
export type SortNamedImportsSortingNode = SortingNode<TSESTree.ImportClause>
/**
 * Union type of all available modifiers for named imports.
 *
 * Modifiers distinguish between type imports and value imports.
 */
export type Modifier = (typeof allModifiers)[number]
/**
 * Union type of all available selectors for named imports.
 *
 * Currently only includes the 'import' selector.
 */
export type Selector = (typeof allSelectors)[number]
/** Match options for a custom group. */
interface CustomGroupMatchOptions {
  /**
   * Array of modifiers that imports must have to match this group. Can
   * include 'type' for type imports or 'value' for value imports.
   */
  modifiers?: Modifier[]
  /**
   * The selector type this group matches. Currently only 'import' is
   * available for named imports.
   */
  selector?: Selector
}
type AdditionalSortOptions = object
/**
 * Array of all available selectors for named imports.
 *
 * Used for validation and configuration in the ESLint rule.
 */
export declare let allSelectors: readonly ['import']
/**
 * Array of all available modifiers for named imports.
 *
 * Used for validation and configuration in the ESLint rule.
 */
export declare let allModifiers: readonly ['value', 'type']
/**
 * Additional custom group match options JSON schema. Used by ESLint to validate
 * rule options at configuration time.
 */
export declare let additionalCustomGroupMatchOptionsJsonSchema: Record<
  string,
  JSONSchema4
>
export {}
