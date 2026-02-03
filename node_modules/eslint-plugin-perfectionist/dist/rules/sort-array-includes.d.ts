import { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import { TSESTree } from '@typescript-eslint/types'
import { TSESLint } from '@typescript-eslint/utils'
import { Options } from './sort-array-includes/types.js'
declare const ORDER_ERROR_ID = 'unexpectedArrayIncludesOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedArrayIncludesGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenArrayIncludesMembers'
declare const MISSED_SPACING_ERROR_ID =
  'missedSpacingBetweenArrayIncludesMembers'
type MessageId =
  | typeof MISSED_SPACING_ERROR_ID
  | typeof EXTRA_SPACING_ERROR_ID
  | typeof GROUP_ORDER_ERROR_ID
  | typeof ORDER_ERROR_ID
export declare let defaultOptions: Required<Options[number]>
export declare let jsonSchema: JSONSchema4
declare const _default: TSESLint.RuleModule<
  MessageId,
  Options,
  import('../utils/create-eslint-rule.js').ESLintPluginDocumentation,
  TSESLint.RuleListener
> & {
  name: string
}
export default _default
export declare function sortArray<MessageIds extends string>({
  availableMessageIds,
  elements,
  context,
}: {
  availableMessageIds: {
    missedSpacingBetweenMembers: MessageIds
    extraSpacingBetweenMembers: MessageIds
    unexpectedGroupOrder: MessageIds
    unexpectedOrder: MessageIds
  }
  elements: (TSESTree.SpreadElement | TSESTree.Expression | null)[]
  context: Readonly<RuleContext<MessageIds, Options>>
}): void
