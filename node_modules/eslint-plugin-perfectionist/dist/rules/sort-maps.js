import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import {
  partitionByNewLineJsonSchema,
  partitionByCommentJsonSchema,
} from '../utils/json-schemas/common-partition-json-schemas.js'
import {
  ORDER_ERROR,
  GROUP_ORDER_ERROR,
  EXTRA_SPACING_ERROR,
  MISSED_SPACING_ERROR,
} from '../utils/report-errors.js'
import {
  buildUseConfigurationIfJsonSchema,
  buildCommonJsonSchemas,
} from '../utils/json-schemas/common-json-schemas.js'
import { defaultComparatorByOptionsComputer } from '../utils/compare/default-comparator-by-options-computer.js'
import { buildOptionsByGroupIndexComputer } from '../utils/build-options-by-group-index-computer.js'
import { buildCommonGroupsJsonSchemas } from '../utils/json-schemas/common-groups-json-schemas.js'
import { validateCustomSortConfiguration } from '../utils/validate-custom-sort-configuration.js'
import { filterOptionsByAllNamesMatch } from '../utils/filter-options-by-all-names-match.js'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.js'
import { getEslintDisabledLines } from '../utils/get-eslint-disabled-lines.js'
import { isNodeEslintDisabled } from '../utils/is-node-eslint-disabled.js'
import { doesCustomGroupMatch } from '../utils/does-custom-group-match.js'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.js'
import { createEslintRule } from '../utils/create-eslint-rule.js'
import { reportAllErrors } from '../utils/report-all-errors.js'
import { shouldPartition } from '../utils/should-partition.js'
import { computeGroup } from '../utils/compute-group.js'
import { rangeToDiff } from '../utils/range-to-diff.js'
import { getSettings } from '../utils/get-settings.js'
import { isSortable } from '../utils/is-sortable.js'
import { complete } from '../utils/complete.js'
const ORDER_ERROR_ID = 'unexpectedMapElementsOrder'
const GROUP_ORDER_ERROR_ID = 'unexpectedMapElementsGroupOrder'
const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenMapElementsMembers'
const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenMapElementsMembers'
let defaultOptions = {
  fallbackSort: { type: 'unsorted' },
  newlinesInside: 'newlinesBetween',
  specialCharacters: 'keep',
  partitionByComment: false,
  partitionByNewLine: false,
  newlinesBetween: 'ignore',
  useConfigurationIf: {},
  type: 'alphabetical',
  ignoreCase: true,
  customGroups: [],
  locales: 'en-US',
  alphabet: '',
  order: 'asc',
  groups: [],
}
const sortMaps = createEslintRule({
  create: context => ({
    NewExpression: node => {
      if (
        node.callee.type !== AST_NODE_TYPES.Identifier ||
        node.callee.name !== 'Map' ||
        node.arguments.length === 0 ||
        node.arguments[0]?.type !== AST_NODE_TYPES.ArrayExpression
      ) {
        return
      }
      let [{ elements }] = node.arguments
      if (!isSortable(elements)) {
        return
      }
      let { sourceCode, id } = context
      let settings = getSettings(context.settings)
      let matchedContextOptions = filterOptionsByAllNamesMatch({
        nodeNames: elements
          .filter(
            element =>
              element !== null && element.type !== AST_NODE_TYPES.SpreadElement,
          )
          .map(element => getNodeName({ sourceCode, element })),
        contextOptions: context.options,
      })
      let options = complete(matchedContextOptions[0], settings, defaultOptions)
      validateCustomSortConfiguration(options)
      validateGroupsConfiguration({
        selectors: [],
        modifiers: [],
        options,
      })
      let eslintDisabledLines = getEslintDisabledLines({
        ruleName: id,
        sourceCode,
      })
      let optionsByGroupIndexComputer =
        buildOptionsByGroupIndexComputer(options)
      let parts = elements.reduce(
        (accumulator, element) => {
          if (
            element === null ||
            element.type === AST_NODE_TYPES.SpreadElement
          ) {
            accumulator.push([])
          } else {
            accumulator.at(-1).push(element)
          }
          return accumulator
        },
        [[]],
      )
      for (let part of parts) {
        let formattedMembers = [[]]
        for (let element of part) {
          let name = getNodeName({
            sourceCode,
            element,
          })
          let lastSortingNode = formattedMembers.at(-1)?.at(-1)
          let group = computeGroup({
            customGroupMatcher: customGroup =>
              doesCustomGroupMatch({
                elementName: name,
                selectors: [],
                modifiers: [],
                customGroup,
              }),
            predefinedGroups: [],
            options,
          })
          let sortingNode = {
            isEslintDisabled: isNodeEslintDisabled(
              element,
              eslintDisabledLines,
            ),
            size: rangeToDiff(element, sourceCode),
            node: element,
            group,
            name,
          }
          if (
            shouldPartition({
              lastSortingNode,
              sortingNode,
              sourceCode,
              options,
            })
          ) {
            formattedMembers.push([])
          }
          formattedMembers.at(-1).push({
            ...sortingNode,
            partitionId: formattedMembers.length,
          })
        }
        for (let nodes of formattedMembers) {
          let createSortNodesExcludingEslintDisabled = function (sortingNodes) {
            return function (ignoreEslintDisabledNodes) {
              return sortNodesByGroups({
                comparatorByOptionsComputer: defaultComparatorByOptionsComputer,
                optionsByGroupIndexComputer,
                ignoreEslintDisabledNodes,
                groups: options.groups,
                nodes: sortingNodes,
              })
            }
          }
          reportAllErrors({
            availableMessageIds: {
              missedSpacingBetweenMembers: MISSED_SPACING_ERROR_ID,
              extraSpacingBetweenMembers: EXTRA_SPACING_ERROR_ID,
              unexpectedGroupOrder: GROUP_ORDER_ERROR_ID,
              unexpectedOrder: ORDER_ERROR_ID,
            },
            sortNodesExcludingEslintDisabled:
              createSortNodesExcludingEslintDisabled(nodes),
            options,
            context,
            nodes,
          })
        }
      }
    },
  }),
  meta: {
    schema: {
      items: {
        properties: {
          ...buildCommonJsonSchemas(),
          ...buildCommonGroupsJsonSchemas(),
          useConfigurationIf: buildUseConfigurationIfJsonSchema(),
          partitionByComment: partitionByCommentJsonSchema,
          partitionByNewLine: partitionByNewLineJsonSchema,
        },
        additionalProperties: false,
        type: 'object',
      },
      uniqueItems: true,
      type: 'array',
    },
    messages: {
      [MISSED_SPACING_ERROR_ID]: MISSED_SPACING_ERROR,
      [EXTRA_SPACING_ERROR_ID]: EXTRA_SPACING_ERROR,
      [GROUP_ORDER_ERROR_ID]: GROUP_ORDER_ERROR,
      [ORDER_ERROR_ID]: ORDER_ERROR,
    },
    docs: {
      url: 'https://perfectionist.dev/rules/sort-maps',
      description: 'Enforce sorted Map elements.',
      recommended: true,
    },
    type: 'suggestion',
    fixable: 'code',
  },
  defaultOptions: [defaultOptions],
  name: 'sort-maps',
})
function getNodeName({ sourceCode, element }) {
  if (element.type === AST_NODE_TYPES.ArrayExpression) {
    let [left] = element.elements
    if (!left) {
      return `${left}`
    } else if (left.type === AST_NODE_TYPES.Literal) {
      return left.raw
    }
    return sourceCode.getText(left)
  }
  return sourceCode.getText(element)
}
export { sortMaps as default }
