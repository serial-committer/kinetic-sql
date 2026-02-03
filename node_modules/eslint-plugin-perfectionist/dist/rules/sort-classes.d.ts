import { Options } from './sort-classes/types.js'
declare const ORDER_ERROR_ID = 'unexpectedClassesOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedClassesGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenClassMembers'
declare const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenClassMembers'
declare const DEPENDENCY_ORDER_ERROR_ID = 'unexpectedClassesDependencyOrder'
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
