import {
  ProcItemCategory,
  ProcItemType,
  WorldConf,
} from '@aresrpg/aresrpg-world'

export const block_type = {
  NONE: {},
  WATER: {},
  ICE: {},
  TREE_TRUNK: {},
  TREE_TRUNK_LIGHT: {},
  TREE_TRUNK_3: {},
  TREE_TRUNK_WHITE: {},
  TREE_TRUNK_DARK: {},
  TREE_FOLIAGE: {},
  TREE_FOLIAGE_2: {},
  SAND: {},
  GRASS: {},
  MUD: {},
  ROCK: {},
  SNOW: {},
  BOARD_HOLE: {},
  DBG_LIGHT: {},
  DBG_DARK: {},
  DBG_ORANGE: {},
  DBG_GREEN: {},
  DBG_PURPLE: {},
}

// assing an enum id to each type
Object.values(block_type).forEach((val, i) => (val.id = i))

// block type color mapping
block_type.NONE.color = 0x000000
block_type.WATER.color = 0x74ccf4
block_type.ICE.color = 0x74ccf4
block_type.TREE_TRUNK.color = 0x795548
block_type.TREE_TRUNK_LIGHT.color = 0xb28459
block_type.TREE_TRUNK_3.color = 0x585349
block_type.TREE_TRUNK_WHITE.color = 0xded3d5
block_type.TREE_TRUNK_DARK.color = 0x3f311d
block_type.TREE_FOLIAGE.color = 0x558b2f
block_type.TREE_FOLIAGE_2.color = 0x33691e
block_type.SAND.color = 0xc2b280
block_type.GRASS.color = 0x41980a
block_type.MUD.color = 0x795548
block_type.ROCK.color = 0xababab
block_type.SNOW.color = 0xe5e5e5
block_type.BOARD_HOLE.color = 0x101010
block_type.DBG_LIGHT.color = 0xf5deb3
block_type.DBG_DARK.color = 0x101010
block_type.DBG_ORANGE.color = 0xff9800 // 0x#FFC107
block_type.DBG_GREEN.color = 0xcddc39
block_type.DBG_PURPLE.color = 0x8a2be2 // 0x673ab7,//0x9c27b0,

// TODO: remove hardcoding and retrieve dynamic value from world
export const sea_level = 76

// World static config override
WorldConf.patchPowSize = 6 // as a power of two (6 => 64 blocks)
// max cache radius
WorldConf.cachePowLimit = 2 // as a power of two (4 => 16 patches radius)
// uncomment following lines to enable debugging vars
WorldConf.debug.patch.borderHighlightColor = block_type.NONE.id
// WorldConf.debug.schematics.missingBlockType = block_type.DBG_DARK

// World items
// const { PineTree_10_5, AppleTree_10_5 } = WorldItem

export const proc_items = {
  AppleTree_S: 'appletree_s',
  PineTree_S: 'pinetre_s',
  AppleTree_M: 'appletree_m',
  PineTree_M: 'pinetre_m',
}

const tree_sizes_conf = {
  small: {
    treeSize: 6,
    treeRadius: 3,
  },
  medium: {
    treeSize: 4,
    treeRadius: 4,
  },
}

export const proc_items_conf = {
  [proc_items.AppleTree_S]: {
    category: ProcItemCategory.Tree,
    params: {
      treeType: ProcItemType.AppleTree,
      ...tree_sizes_conf.small,
    },
  },
  [proc_items.PineTree_S]: {
    category: ProcItemCategory.Tree,
    params: {
      treeType: ProcItemType.PineTree,
      ...tree_sizes_conf.small,
    },
  },
  [proc_items.AppleTree_M]: {
    category: ProcItemCategory.Tree,
    params: {
      treeType: ProcItemType.AppleTree,
      ...tree_sizes_conf.medium,
    },
  },
  [proc_items.PineTree_M]: {
    category: ProcItemCategory.Tree,
    params: {
      treeType: ProcItemType.PineTree,
      ...tree_sizes_conf.medium,
    },
  },
}
