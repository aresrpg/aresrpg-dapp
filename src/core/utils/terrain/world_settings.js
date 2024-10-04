import {
  BlockType,
  ProceduralGenerators,
  WorldConf,
  WorldItem,
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
// export const world_proc_items = {
//   [PineTree_10_5]: new ProceduralGenerators.PineTree(10, 5),
//   [AppleTree_10_5]: new ProceduralGenerators.AppleTree(10, 5),
// }

const { SpruceTree_schem } = WorldItem

const temperate = {
  deep_ocean: {
    id: 0,
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  ocean_cliff_bottom: { x: 0.12, y: 0.1 },
  ocean_cliff_top: { x: 0.15, y: 0.13 },
  beach: {
    id: 1,
    x: 0.2,
    y: 0.26,
    type: BlockType.SAND,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  cliff: {
    id: 3,
    x: 0.25,
    y: 0.33,
    type: BlockType.ROCK,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  valley: {
    id: 4,
    x: 0.31,
    y: 0.43,
    type: BlockType.GRASS,
    subtype: BlockType.NONE,
    entities: [SpruceTree_schem],
    fadeIn: 0,
    fadeOut: 20,
  },
  hill: {
    id: 5,
    x: 0.62,
    y: 0.48,
    type: BlockType.GRASS,
    subtype: BlockType.ROCK,
    mixratio: 0.1,
    fadeIn: 20,
    fadeOut: 40,
  },
  peak: {
    id: 6,
    x: 0.75,
    y: 0.53,
    type: BlockType.GRASS,
    subtype: BlockType.MUD,
    fadeIn: 5,
    fadeOut: 20,
  },
  mountain: {
    id: 7,
    x: 0.83,
    y: 0.6,
    type: BlockType.ROCK,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  high_mountain: {
    id: 8,
    x: 0.88,
    y: 0.85,
    type: BlockType.SNOW,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  top_plateau: {
    x: 0.95,
    y: 0.98,
  },
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
  sea_2: { x: 0.15, y: 0.1 },
  beach: {
    id: 2,
    x: 0.25,
    y: 0.2,
    type: BlockType.ICE,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 3,
  },
  cliff: {
    id: 3,
    x: 0.35,
    y: 0.25,
    type: BlockType.SNOW,
    subtype: BlockType.ICE,
    mixratio: 0.25,
    fadeIn: 2,
    fadeOut: 10,
  },
  cliff_2: { x: 0.45, y: 0.4 },
  lands: {
    id: 4,
    x: 0.5,
    y: 0.4,
    type: BlockType.SNOW,
    subtype: BlockType.ICE,
    entities: [SpruceTree_schem],
    fadeIn: 1,
    fadeOut: 5,
  },
  mountains: {
    id: 5,
    x: 0.6,
    y: 0.45,
    type: BlockType.SNOW,
    subtype: BlockType.ROCK,
    entities: [SpruceTree_schem],
    fadeIn: 5,
    fadeOut: 30,
  },
  mountains_top: {
    id: 6,
    x: 0.85,
    y: 0.6,
    type: BlockType.SNOW,
    subtype: BlockType.ROCK,
    fadeIn: 10,
    fadeOut: 40,
  },
  mountains_top_2: { x: 0.9, y: 0.7 },
  mountains_top_3: { x: 0.95, y: 0.75 },
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
  sea_end: { x: 0.15, y: 0.1 },
  beach: {
    id: 2,
    x: 0.25,
    y: 0.2,
    type: BlockType.SAND,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 3,
  },
  cliff: {
    id: 3,
    x: 0.35,
    y: 0.25,
    type: BlockType.ROCK,
    subtype: BlockType.SAND,
    fadeIn: 2,
    fadeOut: 10,
  },
  dunes: {
    id: 4,
    x: 0.5,
    y: 0.4,
    type: BlockType.SAND,
    subtype: BlockType.NONE,
    fadeIn: 1,
    fadeOut: 10,
  },
  dunes_end: {
    id: 5,
    x: 0.85,
    y: 0.5,
    type: BlockType.SAND,
    subtype: BlockType.ROCK,
    fadeIn: 5,
    fadeOut: 25,
  },
}

export const biome_mapping_conf = { temperate, desert, artic }
