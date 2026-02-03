import {
  buildCustomGroupSelectorJsonSchema,
  buildCustomGroupModifiersJsonSchema,
} from '../../utils/json-schemas/common-groups-json-schemas.js'
import { buildRegexJsonSchema } from '../../utils/json-schemas/common-json-schemas.js'
let allSelectors = [
  'accessor-property',
  'index-signature',
  'constructor',
  'static-block',
  'get-method',
  'set-method',
  'function-property',
  'property',
  'method',
]
let allModifiers = [
  'async',
  'protected',
  'private',
  'public',
  'static',
  'abstract',
  'override',
  'readonly',
  'decorated',
  'declare',
  'optional',
]
let additionalCustomGroupMatchOptionsJsonSchema = {
  modifiers: buildCustomGroupModifiersJsonSchema(allModifiers),
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
  decoratorNamePattern: buildRegexJsonSchema(),
  elementValuePattern: buildRegexJsonSchema(),
}
export {
  additionalCustomGroupMatchOptionsJsonSchema,
  allModifiers,
  allSelectors,
}
