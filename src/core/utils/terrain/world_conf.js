import {
  ProcItemCategory,
  ProcItemType,
  WorldConf,
} from '@aresrpg/aresrpg-world'

export const block_type = {
  NONE: 0,
  WATER: 0,
  ICE: 0,
  TREE_TRUNK: 0,
  TREE_TRUNK_LIGHT: 0,
  TREE_TRUNK_3: 0,
  TREE_TRUNK_WHITE: 0,
  TREE_TRUNK_DARK: 0,
  TREE_FOLIAGE: 0,
  TREE_FOLIAGE_2: 0,
  SAND: 0,
  GRASS: 0,
  MUD: 0,
  ROCK: 0,
  SNOW: 0,
  BOARD_HOLE: 0,
  DBG_LIGHT: 0,
  DBG_DARK: 0,
  DBG_ORANGE: 0,
  DBG_GREEN: 0,
  DBG_PURPLE: 0,
}

// assing an enum id to each type
Object.keys(block_type).forEach((key, i) => (block_type[key] = i))

export const block_color_mapping = {
  [block_type.NONE]: 0x000000,
  [block_type.WATER]: 0x74ccf4,
  [block_type.ICE]: 0x74ccf4,
  [block_type.TREE_TRUNK]: 0x795548,
  [block_type.TREE_TRUNK_LIGHT]: 0xb28459,
  [block_type.TREE_TRUNK_3]: 0x585349,
  [block_type.TREE_TRUNK_WHITE]: 0xded3d5,
  [block_type.TREE_TRUNK_DARK]: 0x3f311d,
  [block_type.TREE_FOLIAGE]: 0x558b2f,
  [block_type.TREE_FOLIAGE_2]: 0x33691e,
  [block_type.SAND]: 0xc2b280,
  [block_type.GRASS]: 0x41980a,
  [block_type.MUD]: 0x795548,
  [block_type.ROCK]: 0xababab,
  [block_type.SNOW]: 0xe5e5e5,
  [block_type.BOARD_HOLE]: 0x101010,
  [block_type.DBG_LIGHT]: 0xf5deb3,
  [block_type.DBG_DARK]: 0x101010,
  [block_type.DBG_ORANGE]: 0xff9800, // 0x#FFC107
  [block_type.DBG_GREEN]: 0xcddc39,
  [block_type.DBG_PURPLE]: 0x8a2be2, // 0x673ab7,//0x9c27b0,
}
// block type color mapping

// TODO: remove hardcoding and retrieve dynamic value from world
export const sea_level = 76

// World static config override
WorldConf.patchPowSize = 6 // as a power of two (6 => 64 blocks)
// max cache radius
WorldConf.cachePowLimit = 2 // as a power of two (4 => 16 patches radius)
// uncomment following lines to enable debugging vars
WorldConf.debug.patch.borderHighlightColor = block_type.NONE
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
