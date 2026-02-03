import { TSESTree } from '@typescript-eslint/types'
import { AllCommonOptions } from '../../types/all-common-options.js'
import { TypeOption } from '../../types/common-options.js'
import { SortingNode } from '../../types/sorting-node.js'
export type Options = Partial<
  AllCommonOptions<TypeOption, AdditionalSortOptions, CustomGroupMatchOptions>
>[]
export type SortImportAttributesSortingNode =
  SortingNode<TSESTree.ImportAttribute>
/** Match options for a custom group. */
type CustomGroupMatchOptions = object
type AdditionalSortOptions = object
export {}
