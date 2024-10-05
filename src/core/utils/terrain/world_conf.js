import {
  BlockType,
  ProcItemCategory,
  ProcItemType,
  WorldConf,
} from '@aresrpg/aresrpg-world'

// World static config override
WorldConf.patchPowSize = 6 // as a power of two (6 => 64 blocks)
// max cache radius
WorldConf.cachePowLimit = 2 // as a power of two (4 => 16 patches radius)
// uncomment following lines to enable debugging vars
WorldConf.debug.patch.borderHighlightColor = BlockType.DBG_LIGHT
// WorldConf.debug.schematics.missingBlockType = BlockType.DBG_DARK

// TODO: remove hardcoding and retrieve dynamic value from world
export const sea_level = 76

// mapping world block types to color
export const blocks_colors = {
  [BlockType.NONE]: 0x000000,
  [BlockType.WATER]: 0x74ccf4,
  [BlockType.ICE]: 0x74ccf4,
  [BlockType.TREE_TRUNK]: 0x795548,
  [BlockType.TREE_FOLIAGE]: 0x558b2f,
  [BlockType.TREE_FOLIAGE_2]: 0x33691e,
  [BlockType.SAND]: 0xc2b280,
  [BlockType.GRASS]: 0x41980a,
  [BlockType.MUD]: 0x795548,
  [BlockType.ROCK]: 0xababab,
  [BlockType.SNOW]: 0xe5e5e5,
  [BlockType.BOARD_HOLE]: 0x101010,
  [BlockType.DBG_LIGHT]: 0xf5deb3,
  [BlockType.DBG_DARK]: 0x101010,
  [BlockType.DBG_ORANGE]: 0xff9800, // 0x#FFC107
  [BlockType.DBG_GREEN]: 0xcddc39,
  [BlockType.DBG_PURPLE]: 0x8a2be2, // 0x673ab7,//0x9c27b0,
}

// World items
// const { PineTree_10_5, AppleTree_10_5 } = WorldItem

export const proc_items = {
  AppleTree_M: 'appletree_m',
  PineTree_M: 'pinetre_m',
}

export const proc_items_conf = {
  [proc_items.AppleTree_M]: {
    category: ProcItemCategory.Tree,
    params: {
      treeType: ProcItemType.AppleTree,
      treeSize: 8,
      treeRadius: 4,
    },
  },
  [proc_items.PineTree_M]: {
    category: ProcItemCategory.Tree,
    params: {
      treeType: ProcItemType.PineTree,
      treeSize: 8,
      treeRadius: 4,
    },
  },
}
