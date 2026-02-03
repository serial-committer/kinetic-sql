import {
  computeStaticModifier,
  computeAbstractModifier,
  computeDecoratedModifier,
  computeOverrideModifier,
  computeAccessibilityModifier,
} from './common-modifiers.js'
import { computeMethodOrPropertyNameDetails } from './compute-method-or-property-name-details.js'
import { computeDependencyName } from '../compute-dependency-name.js'
function computeAccessorDetails({ isDecorated, sourceCode, accessor }) {
  let { nameWithoutStartingHash, hasPrivateHash, name } =
    computeMethodOrPropertyNameDetails(accessor, sourceCode)
  let modifiers = computeModifiers({
    hasPrivateHash,
    isDecorated,
    accessor,
  })
  return {
    dependencyNames: [
      computeDependencyName({
        nodeNameWithoutStartingHash: nameWithoutStartingHash,
        isStatic: modifiers.includes('static'),
        hasPrivateHash,
      }),
    ],
    selectors: ['accessor-property'],
    modifiers,
    name,
  }
}
function computeModifiers({ hasPrivateHash, isDecorated, accessor }) {
  return [
    ...computeStaticModifier(accessor),
    ...computeAbstractModifier(accessor),
    ...computeDecoratedModifier(isDecorated),
    ...computeOverrideModifier(accessor),
    ...computeAccessibilityModifier({
      hasPrivateHash,
      node: accessor,
    }),
  ]
}
export { computeAccessorDetails }
