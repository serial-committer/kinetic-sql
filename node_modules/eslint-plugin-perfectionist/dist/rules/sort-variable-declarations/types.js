import { buildCustomGroupSelectorJsonSchema } from '../../utils/json-schemas/common-groups-json-schemas.js'
let allSelectors = ['initialized', 'uninitialized']
let additionalCustomGroupMatchOptionsJsonSchema = {
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
}
export { additionalCustomGroupMatchOptionsJsonSchema, allSelectors }
