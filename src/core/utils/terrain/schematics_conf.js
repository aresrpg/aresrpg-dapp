import { BlockType } from '@aresrpg/aresrpg-world'

import sprucetree_schem from '../../../assets/terrain/SpruceTree_1.schem?url'

// available schematics
export const schem_items = {
  SpruceTree: 'sprucetree',
}
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
  [schem_items.SpruceTree]: sprucetree_schem,
}
