import { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import { TSESTree } from '@typescript-eslint/types'
import { Options } from './sort-union-types/types.js'
declare const ORDER_ERROR_ID = 'unexpectedUnionTypesOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedUnionTypesGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenUnionTypes'
declare const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenUnionTypes'
type MessageId =
  | typeof MISSED_SPACING_ERROR_ID
  | typeof EXTRA_SPACING_ERROR_ID
  | typeof GROUP_ORDER_ERROR_ID
  | typeof ORDER_ERROR_ID
export declare let jsonSchema: JSONSchema4
declare const _default: import('@typescript-eslint/utils/ts-eslint').RuleModule<
  MessageId,
  Options,
  import('../utils/create-eslint-rule.js').ESLintPluginDocumentation,
  import('@typescript-eslint/utils/ts-eslint').RuleListener
> & {
  name: string
}
export default _default
export declare function sortUnionOrIntersectionTypes<
  MessageIds extends string,
>({
  tokenValueToIgnoreBefore,
  availableMessageIds,
  context,
  node,
}: {
  availableMessageIds: {
    missedSpacingBetweenMembers: MessageIds
    extraSpacingBetweenMembers: MessageIds
    unexpectedGroupOrder: MessageIds
    unexpectedOrder: MessageIds
  }
  node: TSESTree.TSIntersectionType | TSESTree.TSUnionType
  context: Readonly<RuleContext<MessageIds, Options>>
  tokenValueToIgnoreBefore: string
}): void
