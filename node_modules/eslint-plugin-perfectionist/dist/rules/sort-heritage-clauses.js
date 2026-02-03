import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import {
  partitionByCommentJsonSchema,
  partitionByNewLineJsonSchema,
} from '../utils/json-schemas/common-partition-json-schemas.js'
import {
  ORDER_ERROR,
  GROUP_ORDER_ERROR,
  EXTRA_SPACING_ERROR,
  MISSED_SPACING_ERROR,
} from '../utils/report-errors.js'
import { validateNewlinesAndPartitionConfiguration } from '../utils/validate-newlines-and-partition-configuration.js'
import { defaultComparatorByOptionsComputer } from '../utils/compare/default-comparator-by-options-computer.js'
import { buildOptionsByGroupIndexComputer } from '../utils/build-options-by-group-index-computer.js'
import { buildCommonGroupsJsonSchemas } from '../utils/json-schemas/common-groups-json-schemas.js'
import { validateCustomSortConfiguration } from '../utils/validate-custom-sort-configuration.js'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.js'
import { buildCommonJsonSchemas } from '../utils/json-schemas/common-json-schemas.js'
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
const ORDER_ERROR_ID = 'unexpectedHeritageClausesOrder'
const GROUP_ORDER_ERROR_ID = 'unexpectedHeritageClausesGroupOrder'
const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenHeritageClauses'
const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenHeritageClauses'
let defaultOptions = {
  fallbackSort: { type: 'unsorted' },
  newlinesInside: 'newlinesBetween',
  specialCharacters: 'keep',
  newlinesBetween: 'ignore',
  partitionByNewLine: false,
  partitionByComment: false,
  type: 'alphabetical',
  ignoreCase: true,
  customGroups: [],
  locales: 'en-US',
  alphabet: '',
  order: 'asc',
  groups: [],
}
const sortHeritageClauses = createEslintRule({
  meta: {
    schema: {
      items: {
        properties: {
          ...buildCommonJsonSchemas(),
          ...buildCommonGroupsJsonSchemas(),
          partitionByNewLine: partitionByNewLineJsonSchema,
          partitionByComment: partitionByCommentJsonSchema,
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
      url: 'https://perfectionist.dev/rules/sort-heritage-clauses',
      description: 'Enforce sorted heritage clauses.',
      recommended: true,
    },
    type: 'suggestion',
    fixable: 'code',
  },
  create: context => {
    let settings = getSettings(context.settings)
    let options = complete(context.options.at(0), settings, defaultOptions)
    validateCustomSortConfiguration(options)
    validateGroupsConfiguration({
      modifiers: [],
      selectors: [],
      options,
    })
    validateNewlinesAndPartitionConfiguration(options)
    return {
      TSInterfaceDeclaration: declaration =>
        sortHeritageClauses$1(context, options, declaration.extends),
      ClassDeclaration: declaration =>
        sortHeritageClauses$1(context, options, declaration.implements),
    }
  },
  defaultOptions: [defaultOptions],
  name: 'sort-heritage-clauses',
})
function sortHeritageClauses$1(context, options, heritageClauses) {
  if (!isSortable(heritageClauses)) {
    return
  }
  let { sourceCode, id } = context
  let eslintDisabledLines = getEslintDisabledLines({
    ruleName: id,
    sourceCode,
  })
  let optionsByGroupIndexComputer = buildOptionsByGroupIndexComputer(options)
  let formattedMembers = [[]]
  for (let heritageClause of heritageClauses) {
    let name = getHeritageClauseExpressionName(heritageClause.expression)
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
        heritageClause,
        eslintDisabledLines,
      ),
      size: rangeToDiff(heritageClause, sourceCode),
      node: heritageClause,
      partitionId: 0,
      group,
      name,
    }
    let lastSortingNode = formattedMembers.at(-1)?.at(-1)
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
    formattedMembers.at(-1).push(sortingNode)
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
function getHeritageClauseExpressionName(expression) {
  if (expression.type === AST_NODE_TYPES.Identifier) {
    return expression.name
  }
  if ('property' in expression) {
    return getHeritageClauseExpressionName(expression.property)
  }
  throw new Error(
    'Unexpected heritage clause expression. Please report this issue here: https://github.com/azat-io/eslint-plugin-perfectionist/issues',
  )
}
export { sortHeritageClauses as default }
