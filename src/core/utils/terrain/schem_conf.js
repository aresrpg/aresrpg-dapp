import { TREE_SCHEMPACK } from './schempack_trees.js'
import { block_type } from './world_conf.js'

export const SCHEMPACKS = {
  TREES: TREE_SCHEMPACK,
}

// mapping from minecraft to world block types
export const schem_blocks_mapping = {
  air: block_type.NONE.id,
  // grass: block_type.GRASS,
  // LOG
  acacia_log: block_type.TREE_TRUNK_3.id,
  birch_log: block_type.TREE_TRUNK_WHITE.id,
  jungle_log: block_type.TREE_TRUNK.id,
  oak_log: block_type.TREE_TRUNK.id,
  dark_oak_log: block_type.TREE_TRUNK_DARK.id,
  spruce_log: block_type.TREE_TRUNK.id,
  stripped_spruce_log: block_type.TREE_TRUNK.id,
  stripped_dark_oak_log: block_type.TREE_TRUNK.id,
  stripped_oak_log: block_type.TREE_TRUNK.id,
  // WOOD
  acacia_wood: block_type.TREE_TRUNK_3.id,
  birch_wood: block_type.TREE_TRUNK_WHITE.id,
  jungle_wood: block_type.TREE_TRUNK.id,
  oak_wood: block_type.TREE_TRUNK.id,
  dark_oak_wood: block_type.TREE_TRUNK_DARK.id,
  spruce_wood: block_type.TREE_TRUNK.id,
  stripped_spruce_wood: block_type.TREE_TRUNK.id,
  stripped_dark_oak_wood: block_type.TREE_TRUNK.id,
  stripped_oak_wood: block_type.TREE_TRUNK_LIGHT.id,
  // LEAVES
  acacia_leaves: block_type.TREE_FOLIAGE.id,
  birch_leaves: block_type.TREE_FOLIAGE.id,
  cherry_leaves: block_type.TREE_FOLIAGE.id,
  mangrove_leaves: block_type.TREE_FOLIAGE_2.id,
  oak_leaves: block_type.TREE_FOLIAGE.id,
  dark_oak_leaves: block_type.GRASS.id,
  spruce_leaves: block_type.TREE_FOLIAGE_2.id,
  // STONES
  andesite: block_type.ROCK.id,
  cobblestone: block_type.ROCK.id,
  stone: block_type.ROCK.id,
  tuff: block_type.ROCK.id,
}
