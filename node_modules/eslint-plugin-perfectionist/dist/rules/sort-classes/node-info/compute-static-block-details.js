import { computeDependencies } from '../compute-dependencies.js'
function computeStaticBlockDetails({
  ignoreCallbackDependenciesPatterns,
  staticBlock,
  className,
}) {
  return {
    dependencies: computeDependencies({
      ignoreCallbackDependenciesPatterns,
      expression: staticBlock,
      isMemberStatic: true,
      className,
    }),
    selectors: ['static-block'],
    modifiers: [],
  }
}
export { computeStaticBlockDetails }
