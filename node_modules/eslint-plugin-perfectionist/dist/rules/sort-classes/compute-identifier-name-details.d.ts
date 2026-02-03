import { TSESTree } from '@typescript-eslint/types'
export interface NodeNameDetails {
  nameWithoutStartingHash: string
  hasPrivateHash: boolean
  name: string
}
/**
 * Computes the name details of an identifier.
 *
 * @param node - The node to compute the name details for.
 * @returns An object containing the name, whether it has a private hash, and
 *   the name without the starting hash.
 */
export declare function computeIdentifierNameDetails(
  node: TSESTree.PrivateIdentifier | TSESTree.Identifier | TSESTree.Literal,
): NodeNameDetails
