import { matches } from './matches.js'
function filterOptionsByAllNamesMatch({ contextOptions, nodeNames }) {
  return contextOptions.filter(options => {
    let allNamesMatchPattern = options.useConfigurationIf?.allNamesMatchPattern
    return (
      !allNamesMatchPattern ||
      nodeNames.every(nodeName => matches(nodeName, allNamesMatchPattern))
    )
  })
}
export { filterOptionsByAllNamesMatch }
