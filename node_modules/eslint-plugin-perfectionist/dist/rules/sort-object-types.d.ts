import { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import { TSESTree } from '@typescript-eslint/types'
import { ObjectTypeParent, Options } from './sort-object-types/types.js'
declare const ORDER_ERROR_ID = 'unexpectedObjectTypesOrder'
declare const GROUP_ORDER_ERROR_ID = 'unexpectedObjectTypesGroupOrder'
declare const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenObjectTypeMembers'
declare const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenObjectTypeMembers'
type MessageId =
  | typeof MISSED_SPACING_ERROR_ID
  | typeof EXTRA_SPACING_ERROR_ID
  | typeof GROUP_ORDER_ERROR_ID
  | typeof ORDER_ERROR_ID
export declare let defaultOptions: Required<Options[number]>
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
export declare function sortObjectTypeElements<MessageIds extends string>({
  availableMessageIds,
  parentNodes,
  elements,
  context,
}: {
  availableMessageIds: {
    missedSpacingBetweenMembers: MessageIds
    extraSpacingBetweenMembers: MessageIds
    unexpectedGroupOrder: MessageIds
    unexpectedOrder: MessageIds
  }
  context: RuleContext<MessageIds, Options>
  elements: TSESTree.TypeElement[]
  parentNodes: ObjectTypeParent[]
}): void
