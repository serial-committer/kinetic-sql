import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { passesDeclarationMatchesPatternFilter } from './passes-declaration-matches-pattern-filter.js'
import { passesDeclarationCommentMatchesFilter } from './passes-declaration-comment-matches-filter.js'
import { filterOptionsByAllNamesMatch } from '../../utils/filter-options-by-all-names-match.js'
import { UnreachableCaseError } from '../../utils/unreachable-case-error.js'
import { computeNodeName } from './compute-node-name.js'
function computeMatchedContextOptions({
  parentNodes,
  sourceCode,
  elements,
  context,
}) {
  let filteredContextOptions = filterOptionsByAllNamesMatch({
    nodeNames: elements.map(node => computeNodeName({ sourceCode, node })),
    contextOptions: context.options,
  })
  return filteredContextOptions.find(options =>
    isContextOptionMatching({
      parentNodes,
      sourceCode,
      elements,
      options,
    }),
  )
}
function passesHasNumericKeysOnlyFilter({
  hasNumericKeysOnlyFilter,
  typeElements,
}) {
  let hasOnlyNumericKeys = hasNumericKeysOnly()
  switch (hasNumericKeysOnlyFilter) {
    case void 0:
      return true
    case false:
      return !hasOnlyNumericKeys
    case true:
      return hasOnlyNumericKeys
    /* v8 ignore next 2 -- @preserve Exhaustive guard. */
    default:
      throw new UnreachableCaseError(hasNumericKeysOnlyFilter)
  }
  function hasNumericKeysOnly() {
    return typeElements.every(isNumericKey)
    function isNumericKey(typeElement) {
      return (
        typeElement.type === AST_NODE_TYPES.TSPropertySignature &&
        typeElement.key.type === AST_NODE_TYPES.Literal &&
        typeof typeElement.key.value === 'number'
      )
    }
  }
}
function isContextOptionMatching({
  parentNodes,
  sourceCode,
  elements,
  options,
}) {
  if (!options.useConfigurationIf) {
    return true
  }
  return (
    passesDeclarationMatchesPatternFilter({
      declarationMatchesPattern:
        options.useConfigurationIf.declarationMatchesPattern,
      parentNodes,
      sourceCode,
    }) &&
    passesHasNumericKeysOnlyFilter({
      hasNumericKeysOnlyFilter: options.useConfigurationIf.hasNumericKeysOnly,
      typeElements: elements,
    }) &&
    passesDeclarationCommentMatchesFilter({
      declarationCommentMatchesPattern:
        options.useConfigurationIf.declarationCommentMatchesPattern,
      parentNodes,
      sourceCode,
    })
  )
}
export { computeMatchedContextOptions }
