import { BlockType, WorldUtils } from '@aresrpg/aresrpg-world'

/**
 * Debug vars
 * uncomment following lines to enable debugging feats
 */
// WorldConf.debug.patch.borderHighlightColor = block_type.DBG_LIGHT
// WorldConf.debug.schematics.missingBlockType = block_type.DBG_DARK

/**
 * Block types (extending native types)
 */
const block_type = {
  TREE_TRUNK: 0,
  TREE_TRUNK_LIGHT: 0,
  TREE_TRUNK_3: 0,
  TREE_TRUNK_WHITE: 0,
  TREE_TRUNK_DARK: 0,
  DBG_LIGHT: 0,
  DBG_DARK: 0,
  DBG_ORANGE: 0,
  DBG_GREEN: 0,
  DBG_PURPLE: 0,
}

// assing an enum id to each type
WorldUtils.typesNumbering(block_type, BlockType.LAST_PLACEHOLDER)

/**
 * Blocks color mapping
 */
export const BLOCKS_COLOR_MAPPING = {
  [BlockType.NONE]: 0x000000,
  [BlockType.HOLE]: 0x000000,
  [BlockType.BEDROCK]: 0xababab,
  [BlockType.WATER]: 0x74ccf4,
  [BlockType.ICE]: 0x74ccf4,
  [BlockType.MUD]: 0x795548,
  [BlockType.TRUNK]: 0x795548,
  [BlockType.SAND]: 0xc2b280,
  [BlockType.GRASS]: 0x41980a,
  [BlockType.ROCK]: 0xababab,
  [BlockType.SNOW]: 0xe5e5e5,
  [BlockType.FOLIAGE_LIGHT]: 0x558b2f,
  [BlockType.FOLIAGE_DARK]: 0x33691e,
  [block_type.TREE_TRUNK]: 0x795548,
  [block_type.TREE_TRUNK_LIGHT]: 0xb28459,
  [block_type.TREE_TRUNK_3]: 0x585349,
  [block_type.TREE_TRUNK_WHITE]: 0xded3d5,
  [block_type.TREE_TRUNK_DARK]: 0x3f311d,
  [block_type.DBG_LIGHT]: 0xf5deb3,
  [block_type.DBG_DARK]: 0x101010,
  [block_type.DBG_ORANGE]: 0xff9800, // 0x#FFC107
  [block_type.DBG_GREEN]: 0xcddc39,
  [block_type.DBG_PURPLE]: 0x8a2be2, // 0x673ab7,//0x9c27b0,
}

export const SCHEMATICS_BLOCKS_MAPPING = {
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
  dark_oak_leaves: BlockType.GRASS,
  spruce_leaves: BlockType.FOLIAGE_DARK,
  // STONES
  andesite: block_type.ROCK,
  cobblestone: block_type.ROCK,
  stone: block_type.ROCK,
  tuff: block_type.ROCK,
}
