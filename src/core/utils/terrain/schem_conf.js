import { BlockType } from '@aresrpg/aresrpg-world'

import { TREE_SCHEMPACK } from './schempack_trees.js'
import { block_type } from './world_conf.js'

export const SCHEMPACKS = {
  TREES: TREE_SCHEMPACK,
}

// mapping from minecraft to world block types
export const schem_blocks_mapping = {
  air: BlockType.NONE,
  // grass: block_type.GRASS,
  // LOG
  acacia_log: block_type.TREE_TRUNK_3,
  birch_log: block_type.TREE_TRUNK_WHITE,
  jungle_log: block_type.TREE_TRUNK,
  oak_log: block_type.TREE_TRUNK,
  dark_oak_log: block_type.TREE_TRUNK_DARK,
  spruce_log: block_type.TREE_TRUNK,
  stripped_spruce_log: block_type.TREE_TRUNK,
  stripped_dark_oak_log: block_type.TREE_TRUNK,
  stripped_oak_log: block_type.TREE_TRUNK,
  // WOOD
  acacia_wood: block_type.TREE_TRUNK_3,
  birch_wood: block_type.TREE_TRUNK_WHITE,
  jungle_wood: block_type.TREE_TRUNK,
  oak_wood: block_type.TREE_TRUNK,
  dark_oak_wood: block_type.TREE_TRUNK_DARK,
  spruce_wood: block_type.TREE_TRUNK,
  stripped_spruce_wood: block_type.TREE_TRUNK,
  stripped_dark_oak_wood: block_type.TREE_TRUNK,
  stripped_oak_wood: block_type.TREE_TRUNK_LIGHT,
  // LEAVES
  acacia_leaves: BlockType.FOLIAGE_LIGHT,
  birch_leaves: BlockType.FOLIAGE_LIGHT,
  cherry_leaves: BlockType.FOLIAGE_LIGHT,
  mangrove_leaves: BlockType.FOLIAGE_DARK,
  oak_leaves: BlockType.FOLIAGE_LIGHT,
  dark_oak_leaves: block_type.GRASS,
  spruce_leaves: BlockType.FOLIAGE_DARK,
  // STONES
  andesite: block_type.ROCK,
  cobblestone: block_type.ROCK,
  stone: block_type.ROCK,
  tuff: block_type.ROCK,
}
