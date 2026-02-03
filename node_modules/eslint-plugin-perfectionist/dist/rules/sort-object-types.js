import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import {
  additionalCustomGroupMatchOptionsJsonSchema,
  additionalSortOptionsJsonSchema,
  allSelectors,
  allModifiers,
  objectTypeParentTypes,
} from './sort-object-types/types.js'
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
import { validateNewlinesAndPartitionConfiguration } from '../utils/validate-newlines-and-partition-configuration.js'
import { computeMatchedContextOptions } from './sort-object-types/compute-matched-context-options.js'
import { buildOptionsByGroupIndexComputer } from '../utils/build-options-by-group-index-computer.js'
import { comparatorByOptionsComputer } from './sort-object-types/comparator-by-options-computer.js'
import { buildCommonGroupsJsonSchemas } from '../utils/json-schemas/common-groups-json-schemas.js'
import { validateCustomSortConfiguration } from '../utils/validate-custom-sort-configuration.js'
import { computeParentNodesWithTypes } from '../utils/compute-parent-nodes-with-types.js'
import { scopedRegexJsonSchema } from '../utils/json-schemas/scoped-regex-json-schema.js'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.js'
import { generatePredefinedGroups } from '../utils/generate-predefined-groups.js'
import { isNodeFunctionType } from './sort-object-types/is-node-function-type.js'
import { getEslintDisabledLines } from '../utils/get-eslint-disabled-lines.js'
import { isMemberOptional } from './sort-object-types/is-member-optional.js'
import { isNodeEslintDisabled } from '../utils/is-node-eslint-disabled.js'
import { doesCustomGroupMatch } from '../utils/does-custom-group-match.js'
import { computeNodeName } from './sort-object-types/compute-node-name.js'
import { UnreachableCaseError } from '../utils/unreachable-case-error.js'
import { isNodeOnSingleLine } from '../utils/is-node-on-single-line.js'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.js'
import { createEslintRule } from '../utils/create-eslint-rule.js'
import { reportAllErrors } from '../utils/report-all-errors.js'
import { shouldPartition } from '../utils/should-partition.js'
import { computeGroup } from '../utils/compute-group.js'
import { rangeToDiff } from '../utils/range-to-diff.js'
import { getSettings } from '../utils/get-settings.js'
import { isSortable } from '../utils/is-sortable.js'
import { complete } from '../utils/complete.js'
let cachedGroupsByModifiersAndSelectors = /* @__PURE__ */ new Map()
const ORDER_ERROR_ID = 'unexpectedObjectTypesOrder'
const GROUP_ORDER_ERROR_ID = 'unexpectedObjectTypesGroupOrder'
const EXTRA_SPACING_ERROR_ID = 'extraSpacingBetweenObjectTypeMembers'
const MISSED_SPACING_ERROR_ID = 'missedSpacingBetweenObjectTypeMembers'
let defaultOptions = {
  fallbackSort: { type: 'unsorted', sortBy: 'name' },
  newlinesInside: 'newlinesBetween',
  partitionByComment: false,
  partitionByNewLine: false,
  newlinesBetween: 'ignore',
  specialCharacters: 'keep',
  useConfigurationIf: {},
  type: 'alphabetical',
  ignoreCase: true,
  customGroups: [],
  locales: 'en-US',
  sortBy: 'name',
  alphabet: '',
  order: 'asc',
  groups: [],
}
let jsonSchema = {
  items: {
    properties: {
      ...buildCommonJsonSchemas({
        additionalSortProperties: additionalSortOptionsJsonSchema,
      }),
      ...buildCommonGroupsJsonSchemas({
        additionalCustomGroupMatchProperties:
          additionalCustomGroupMatchOptionsJsonSchema,
        additionalSortProperties: additionalSortOptionsJsonSchema,
      }),
      useConfigurationIf: buildUseConfigurationIfJsonSchema({
        additionalProperties: {
          hasNumericKeysOnly: {
            description:
              'Specifies whether to only match types that have exclusively numeric keys.',
            type: 'boolean',
          },
          declarationCommentMatchesPattern: scopedRegexJsonSchema,
          declarationMatchesPattern: scopedRegexJsonSchema,
        },
      }),
      partitionByComment: partitionByCommentJsonSchema,
      partitionByNewLine: partitionByNewLineJsonSchema,
    },
    additionalProperties: false,
    type: 'object',
  },
  uniqueItems: true,
  type: 'array',
}
const sortObjectTypes = createEslintRule({
  create: context => ({
    TSTypeLiteral: node =>
      sortObjectTypeElements({
        availableMessageIds: {
          missedSpacingBetweenMembers: MISSED_SPACING_ERROR_ID,
          extraSpacingBetweenMembers: EXTRA_SPACING_ERROR_ID,
          unexpectedGroupOrder: GROUP_ORDER_ERROR_ID,
          unexpectedOrder: ORDER_ERROR_ID,
        },
        parentNodes: computeObjectTypeParentNodes(node),
        elements: node.members,
        context,
      }),
  }),
  meta: {
    messages: {
      [MISSED_SPACING_ERROR_ID]: MISSED_SPACING_ERROR,
      [EXTRA_SPACING_ERROR_ID]: EXTRA_SPACING_ERROR,
      [GROUP_ORDER_ERROR_ID]: GROUP_ORDER_ERROR,
      [ORDER_ERROR_ID]: ORDER_ERROR,
    },
    docs: {
      url: 'https://perfectionist.dev/rules/sort-object-types',
      description: 'Enforce sorted object types.',
      recommended: true,
    },
    schema: jsonSchema,
    type: 'suggestion',
    fixable: 'code',
  },
  defaultOptions: [defaultOptions],
  name: 'sort-object-types',
})
function sortObjectTypeElements({
  availableMessageIds,
  parentNodes,
  elements,
  context,
}) {
  if (!isSortable(elements)) {
    return
  }
  let settings = getSettings(context.settings)
  let { sourceCode, id } = context
  let matchedContextOptions = computeMatchedContextOptions({
    parentNodes,
    sourceCode,
    elements,
    context,
  })
  let options = complete(matchedContextOptions, settings, defaultOptions)
  validateCustomSortConfiguration(options)
  validateGroupsConfiguration({
    selectors: allSelectors,
    modifiers: allModifiers,
    options,
  })
  validateNewlinesAndPartitionConfiguration(options)
  let eslintDisabledLines = getEslintDisabledLines({
    ruleName: id,
    sourceCode,
  })
  let optionsByGroupIndexComputer = buildOptionsByGroupIndexComputer(options)
  let formattedMembers = [[]]
  for (let typeElement of elements) {
    if (
      typeElement.type === AST_NODE_TYPES.TSCallSignatureDeclaration ||
      typeElement.type === AST_NODE_TYPES.TSConstructSignatureDeclaration
    ) {
      continue
    }
    let lastGroup = formattedMembers.at(-1)
    let lastSortingNode = lastGroup?.at(-1)
    let selectors = []
    let modifiers = []
    if (typeElement.type === AST_NODE_TYPES.TSIndexSignature) {
      selectors.push('index-signature')
    }
    if (isNodeFunctionType(typeElement)) {
      selectors.push('method')
    }
    if (!isNodeOnSingleLine(typeElement)) {
      modifiers.push('multiline')
    }
    if (
      !['index-signature', 'method'].some(selector =>
        selectors.includes(selector),
      )
    ) {
      selectors.push('property')
    }
    selectors.push('member')
    if (isMemberOptional(typeElement)) {
      modifiers.push('optional')
    } else {
      modifiers.push('required')
    }
    let name = computeNodeName({ node: typeElement, sourceCode })
    let value = null
    if (
      typeElement.type === AST_NODE_TYPES.TSPropertySignature &&
      typeElement.typeAnnotation
    ) {
      value = sourceCode.getText(typeElement.typeAnnotation.typeAnnotation)
    }
    let predefinedGroups = generatePredefinedGroups({
      cache: cachedGroupsByModifiersAndSelectors,
      selectors,
      modifiers,
    })
    let group = computeGroup({
      customGroupMatcher: customGroup =>
        doesCustomGroupMatch({
          elementValue: value,
          elementName: name,
          customGroup,
          selectors,
          modifiers,
        }),
      predefinedGroups,
      options,
    })
    let sortingNode = {
      isEslintDisabled: isNodeEslintDisabled(typeElement, eslintDisabledLines),
      size: rangeToDiff(typeElement, sourceCode),
      addSafetySemicolonWhenInline: true,
      value: value ?? '',
      node: typeElement,
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
      lastGroup = []
      formattedMembers.push(lastGroup)
    }
    lastGroup?.push({
      ...sortingNode,
      partitionId: formattedMembers.length,
    })
  }
  let nodes = formattedMembers.flat()
  reportAllErrors({
    sortNodesExcludingEslintDisabled,
    availableMessageIds,
    options,
    context,
    nodes,
  })
  function sortNodesExcludingEslintDisabled(ignoreEslintDisabledNodes) {
    return formattedMembers.flatMap(groupedNodes =>
      sortNodesByGroups({
        isNodeIgnoredForGroup: ({ groupOptions, node }) => {
          switch (groupOptions.sortBy) {
            case 'value':
              return !node.value
            case 'name':
              return false
            /* v8 ignore next 2 -- @preserve Exhaustive guard. */
            default:
              throw new UnreachableCaseError(groupOptions.sortBy)
          }
        },
        optionsByGroupIndexComputer,
        comparatorByOptionsComputer,
        ignoreEslintDisabledNodes,
        groups: options.groups,
        nodes: groupedNodes,
      }),
    )
  }
}
function computeObjectTypeParentNodes(node) {
  return computeParentNodesWithTypes({
    allowedTypes: [...objectTypeParentTypes],
    consecutiveOnly: false,
    maxParent: null,
    node,
  })
}
export {
  sortObjectTypes as default,
  defaultOptions,
  jsonSchema,
  sortObjectTypeElements,
}
