import { AllCommonOptions } from '../../types/all-common-options.js'
import { TypeOption } from '../../types/common-options.js'
export type Options = Partial<
  AllCommonOptions<TypeOption, AdditionalSortOptions, CustomGroupMatchOptions>
>[]
/** Match options for a custom group. */
type CustomGroupMatchOptions = object
type AdditionalSortOptions = object
export {}
