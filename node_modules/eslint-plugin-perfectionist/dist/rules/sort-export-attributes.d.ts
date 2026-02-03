import { TSESLint } from '@typescript-eslint/utils'
import { Options } from './sort-export-attributes/types.js'
declare const ORDER_ERROR_ID = 'unexpectedExportAttributesOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedExportAttributesGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenExportAttributes'
declare const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenExportAttributes'
type MessageId =
  | typeof MISSED_SPACING_ERROR_ID
  | typeof EXTRA_SPACING_ERROR_ID
  | typeof GROUP_ORDER_ERROR_ID
  | typeof ORDER_ERROR_ID
declare const _default: TSESLint.RuleModule<
  MessageId,
  Options,
  import('../utils/create-eslint-rule.js').ESLintPluginDocumentation,
  TSESLint.RuleListener
> & {
  name: string
}
export default _default
