import { Options } from './sort-enums/types.js'
declare const ORDER_ERROR_ID = 'unexpectedEnumsOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedEnumsGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenEnumsMembers'
declare const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenEnumsMembers'
declare const DEPENDENCY_ORDER_ERROR_ID = 'unexpectedEnumsDependencyOrder'
type MessageId =
  | typeof DEPENDENCY_ORDER_ERROR_ID
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
