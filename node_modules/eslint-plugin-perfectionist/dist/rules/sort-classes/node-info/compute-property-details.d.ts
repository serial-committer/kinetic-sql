import { TSESTree } from '@typescript-eslint/types'
import { TSESLint } from '@typescript-eslint/utils'
import { RegexOption } from '../../../types/common-options.js'
import { Modifier, Selector } from '../types.js'
/**
 * Computes details related to a property.
 *
 * @param params - Parameters object.
 * @param params.isDecorated - Whether the accessor is decorated.
 * @param params.property - The property node to compute information for.
 * @param params.ignoreCallbackDependenciesPatterns - Patterns to ignore when
 *   computing dependencies.
 * @param params.sourceCode - The source code object.
 * @param params.className - The name of the class containing the property.
 * @returns An object containing various details about the property.
 */
export declare function computePropertyDetails({
  ignoreCallbackDependenciesPatterns,
  isDecorated,
  sourceCode,
  className,
  property,
}: {
  property: TSESTree.TSAbstractPropertyDefinition | TSESTree.PropertyDefinition
  ignoreCallbackDependenciesPatterns: RegexOption
  sourceCode: TSESLint.SourceCode
  className: undefined | string
  isDecorated: boolean
}): {
  memberValue: undefined | string
  dependencyNames: string[]
  dependencies: string[]
  modifiers: Modifier[]
  selectors: Selector[]
  name: string
}
