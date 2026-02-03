import { Options } from './sort-named-exports/types.js'
declare const ORDER_ERROR_ID = 'unexpectedNamedExportsOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedNamedExportsGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenNamedExports'
declare const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenNamedExports'
type MessageId =
  | typeof MISSED_SPACING_ERROR_ID
  | typeof EXTRA_SPACING_ERROR_ID
  | typeof GROUP_ORDER_ERROR_ID
  | typeof ORDER_ERROR_ID
declare const _default: import('@typescript-eslint/utils/ts-eslint').RuleModule<
  MessageId,
  Options,
  import('../utils/create-eslint-rule.js').ESLintPluginDocumentation,
  import('@typescript-eslint/utils/ts-eslint').RuleListener
> & {
  name: string
}
export default _default
