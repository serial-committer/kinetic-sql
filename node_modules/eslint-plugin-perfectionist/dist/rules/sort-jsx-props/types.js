import {
  buildCustomGroupSelectorJsonSchema,
  buildCustomGroupModifiersJsonSchema,
} from '../../utils/json-schemas/common-groups-json-schemas.js'
import { buildRegexJsonSchema } from '../../utils/json-schemas/common-json-schemas.js'
let allSelectors = ['prop']
let allModifiers = ['shorthand', 'multiline']
let additionalCustomGroupMatchOptionsJsonSchema = {
  modifiers: buildCustomGroupModifiersJsonSchema(allModifiers),
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
  elementValuePattern: buildRegexJsonSchema(),
}
export {
  additionalCustomGroupMatchOptionsJsonSchema,
  allModifiers,
  allSelectors,
}
