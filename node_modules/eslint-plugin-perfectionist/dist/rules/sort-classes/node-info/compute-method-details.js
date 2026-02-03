import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import {
  computeStaticModifier,
  computeAbstractModifier,
  computeDecoratedModifier,
  computeOverrideModifier,
  computeAccessibilityModifier,
  computeOptionalModifier,
  computeAsyncModifier,
} from './common-modifiers.js'
import { computeMethodOrPropertyNameDetails } from './compute-method-or-property-name-details.js'
import { UnreachableCaseError } from '../../../utils/unreachable-case-error.js'
function computeMethodDetails({
  hasParentDeclare,
  isDecorated,
  sourceCode,
  method,
}) {
  let { hasPrivateHash, name } = computeMethodOrPropertyNameDetails(
    method,
    sourceCode,
  )
  return {
    addSafetySemicolonWhenInline: shouldAddSafetySemicolonWhenInline({
      hasParentDeclare,
      method,
    }),
    modifiers: computeModifiers({
      hasPrivateHash,
      isDecorated,
      method,
    }),
    selectors: computeSelectors(method),
    name,
  }
}
function computeSelectors(method) {
  return [...computeSetterOrConstructorSelector(), 'method']
  function computeSetterOrConstructorSelector() {
    switch (method.kind) {
      case 'constructor':
        return ['constructor']
      case 'method':
        return []
      case 'set':
        return ['set-method']
      case 'get':
        return ['get-method']
      /* v8 ignore next 2 -- @preserve Exhaustive guard. */
      default:
        throw new UnreachableCaseError(method.kind)
    }
  }
}
function computeModifiers({ hasPrivateHash, isDecorated, method }) {
  return [
    ...computeStaticModifier(method),
    ...computeAbstractModifier(method),
    ...computeDecoratedModifier(isDecorated),
    ...computeOverrideModifier(method),
    ...computeAccessibilityModifier({
      hasPrivateHash,
      node: method,
    }),
    ...computeOptionalModifier(method),
    ...computeAsyncModifier(method.value),
  ]
}
function shouldAddSafetySemicolonWhenInline({ hasParentDeclare, method }) {
  switch (method.type) {
    case AST_NODE_TYPES.TSAbstractMethodDefinition:
      return true
    case AST_NODE_TYPES.MethodDefinition:
      return hasParentDeclare
    /* v8 ignore next 2 -- @preserve Exhaustive guard. */
    default:
      throw new UnreachableCaseError(method)
  }
}
export { computeMethodDetails }
