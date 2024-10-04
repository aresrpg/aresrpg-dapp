import { BlockType, WorldConf, WorldItem } from '@aresrpg/aresrpg-world'
const { SpruceTree_schem } = WorldItem

// World static config override
WorldConf.patchPowSize = 6 // as a power of two (6 => 64 blocks)
// max cache radius
WorldConf.cachePowLimit = 2 // as a power of two (4 => 16 patches radius)
// uncomment following lines to enable debugging vars
WorldConf.debug.patch.borderHighlightColor = BlockType.DBG_LIGHT
// WorldConf.debug.schematics.missingBlockType = BlockType.DBG_DARK

// TODO: remove hardcoding and retrieve dynamic value from world
export const sea_level = 76

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

const temperate = {
  sea: {
    id: 0,
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  sea_2: { x: 0.18, y: 0.05 },
  beach: {
    id: 2,
    x: 0.26,
    y: 0.21,
    type: BlockType.SAND,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 5,
  },
  cliff: {
    id: 3,
    x: 0.33,
    y: 0.23,
    type: BlockType.ROCK,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 0,
  },
  cliff_2: { x: 0.48, y: 0.42 },
  lands: {
    id: 4,
    x: 0.48,
    y: 0.42,
    type: BlockType.GRASS,
    subtype: BlockType.MUD,
    entities: [SpruceTree_schem],
    fadeIn: 0,
    fadeOut: 0.2,
  },
  mountains: {
    id: 5,
    x: 0.71,
    y: 0.52,
    type: BlockType.ROCK,
    subtype: BlockType.GRASS,
    entities: [SpruceTree_schem],
    mixratio: 0.1,
    fadeIn: 0,
    fadeOut: 25,
  },
  mountains_top: {
    id: 6,
    x: 0.9,
    y: 0.76,
    type: BlockType.SNOW,
    subtype: BlockType.ROCK,
    fadeIn: 0,
    fadeOut: 0,
  },
  mountains_top_2: { x: 0.95, y: 0.92 },
  mountains_top_3: { x: 1, y: 0.9 },
}

const artic = {
  sea: {
    id: 0,
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 1,
  },
  sea_2: { x: 0.18, y: 0.05 },
  beach: {
    id: 2,
    x: 0.26,
    y: 0.21,
    type: BlockType.ICE,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 3,
  },
  cliff: {
    id: 3,
    x: 0.33,
    y: 0.23,
    type: BlockType.SNOW,
    subtype: BlockType.ICE,
    mixratio: 0.25,
    fadeIn: 2,
    fadeOut: 10,
  },
  cliff_2: { x: 0.48, y: 0.42 },
  lands: {
    id: 4,
    x: 0.48,
    y: 0.42,
    type: BlockType.SNOW,
    subtype: BlockType.ICE,
    entities: [SpruceTree_schem],
    fadeIn: 1,
    fadeOut: 5,
  },
  mountains: {
    id: 5,
    x: 0.71,
    y: 0.45,
    type: BlockType.SNOW,
    subtype: BlockType.ROCK,
    entities: [SpruceTree_schem],
    fadeIn: 5,
    fadeOut: 30,
  },
  mountains_top: {
    id: 6,
    x: 0.9,
    y: 0.65,
    type: BlockType.SNOW,
    subtype: BlockType.ROCK,
    fadeIn: 10,
    fadeOut: 40,
  },
  mountains_top_2: { x: 0.95, y: 0.7 },
  mountains_top_3: { x: 1, y: 0.7 },
}

const desert = {
  sea_start: {
    id: 0,
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 1,
  },
  sea_end: { x: 0.18, y: 0.05 },
  beach: {
    id: 2,
    x: 0.26,
    y: 0.21,
    type: BlockType.SAND,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 3,
  },
  cliff: {
    id: 3,
    x: 0.33,
    y: 0.23,
    type: BlockType.ROCK,
    subtype: BlockType.SAND,
    fadeIn: 2,
    fadeOut: 10,
  },
  dunes: {
    id: 4,
    x: 0.48,
    y: 0.42,
    type: BlockType.SAND,
    subtype: BlockType.NONE,
    fadeIn: 1,
    fadeOut: 10,
  },
  dunes_end: {
    id: 5,
    x: 1,
    y: 0.52,
    type: BlockType.SAND,
    subtype: BlockType.ROCK,
    fadeIn: 5,
    fadeOut: 25,
  },
}

export const biome_mapping_conf = { temperate, desert, artic }
