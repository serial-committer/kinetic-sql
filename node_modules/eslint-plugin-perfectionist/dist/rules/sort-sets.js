import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import {
  ORDER_ERROR,
  GROUP_ORDER_ERROR,
  EXTRA_SPACING_ERROR,
  MISSED_SPACING_ERROR,
} from '../utils/report-errors.js'
import { defaultOptions, jsonSchema, sortArray } from './sort-array-includes.js'
import { createEslintRule } from '../utils/create-eslint-rule.js'
const ORDER_ERROR_ID = 'unexpectedSetsOrder'
const GROUP_ORDER_ERROR_ID = 'unexpectedSetsGroupOrder'
const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenSetsMembers'
const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenSetsMembers'
const sortSets = createEslintRule({
  create: context => ({
    NewExpression: node => {
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'Set' &&
        node.arguments.length > 0 &&
        (node.arguments[0]?.type === AST_NODE_TYPES.ArrayExpression ||
          (node.arguments[0]?.type === AST_NODE_TYPES.NewExpression &&
            'name' in node.arguments[0].callee &&
            node.arguments[0].callee.name === 'Array'))
      ) {
        let elements =
          node.arguments[0].type === AST_NODE_TYPES.ArrayExpression
            ? node.arguments[0].elements
            : node.arguments[0].arguments
        sortArray({
          availableMessageIds: {
            missedSpacingBetweenMembers: MISSED_SPACING_ERROR_ID,
            extraSpacingBetweenMembers: EXTRA_SPACING_ERROR_ID,
            unexpectedGroupOrder: GROUP_ORDER_ERROR_ID,
            unexpectedOrder: ORDER_ERROR_ID,
          },
          elements,
          context,
        })
      }
    },
  }),
  meta: {
    messages: {
      [MISSED_SPACING_ERROR_ID]: MISSED_SPACING_ERROR,
      [EXTRA_SPACING_ERROR_ID]: EXTRA_SPACING_ERROR,
      [GROUP_ORDER_ERROR_ID]: GROUP_ORDER_ERROR,
      [ORDER_ERROR_ID]: ORDER_ERROR,
    },
    docs: {
      url: 'https://perfectionist.dev/rules/sort-sets',
      description: 'Enforce sorted sets.',
      recommended: true,
    },
    schema: jsonSchema,
    type: 'suggestion',
    fixable: 'code',
  },
  defaultOptions: [defaultOptions],
  name: 'sort-sets',
})
export { sortSets as default }
