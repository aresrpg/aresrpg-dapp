import { BlockType, WorldItem } from '@aresrpg/aresrpg-world'

import sprucetree_schem from '../../../assets/terrain/SpruceTree_1.schem?url'

// supported schematics types
const { SpruceTree_schem } = WorldItem

// export const schem_types = {

// }
// mapping from minecraft to world block types
export const schem_blocks_mapping = {
  air: BlockType.NONE,
  // grass: BlockType.GRASS,
  spruce_log: BlockType.TREE_TRUNK,
  spruce_leaves: BlockType.TREE_FOLIAGE,
}

// schematics external definition files
export const schem_files = {
  [SpruceTree_schem]: sprucetree_schem,
}
