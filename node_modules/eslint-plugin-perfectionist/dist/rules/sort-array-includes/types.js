import { buildCustomGroupSelectorJsonSchema } from '../../utils/json-schemas/common-groups-json-schemas.js'
let allSelectors = ['literal', 'spread']
let additionalCustomGroupMatchOptionsJsonSchema = {
  selector: buildCustomGroupSelectorJsonSchema(allSelectors),
}
export { additionalCustomGroupMatchOptionsJsonSchema, allSelectors }
