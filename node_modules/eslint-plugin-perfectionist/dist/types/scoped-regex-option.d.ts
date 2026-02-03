import { RegexOption } from './common-options.js'
export type ScopedRegexOption = RegexOption<{
  scope?: Scope
}>
export type Scope = (typeof regexScopes)[number]
export declare let regexScopes: readonly ['shallow', 'deep']
