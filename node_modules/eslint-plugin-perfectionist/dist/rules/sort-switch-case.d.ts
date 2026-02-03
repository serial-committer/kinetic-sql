import { TSESLint } from '@typescript-eslint/utils'
import { CommonOptions, TypeOption } from '../types/common-options.js'
type Options = [Partial<CommonOptions<TypeOption>>]
declare const _default: TSESLint.RuleModule<
  'unexpectedSwitchCaseOrder',
  Options,
  import('../utils/create-eslint-rule.js').ESLintPluginDocumentation,
  TSESLint.RuleListener
> & {
  name: string
}
export default _default
