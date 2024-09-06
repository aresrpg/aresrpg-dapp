import { BlockType, WorldConf } from '@aresrpg/aresrpg-world'

// World static config
WorldConf.patchPowSize = 6 // as a power of two (6 => 64 blocks)
// max cache radius
WorldConf.cachePowLimit = 2 // as a power of two (4 => 16 patches radius)
// debug vars
WorldConf.debug.patchBordersHighlightColor = BlockType.NONE // BlockType.DBG_LIGHT
WorldConf.debug.boardStartPosHighlightColor = BlockType.DBG_PURPLE // BlockType.DBG_GREEN
WorldConf.debug.boardStartSideColoring = false

// TODO remove hardcoding and retrieve dynamic value from world
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
  deep_ocean: {
    id: 0,
    x: 0,
    y: 0,
    grounds: [BlockType.WATER],
    amplitude: {
      low: 0,
      high: 2,
    },
  },
  ocean_cliff_bottom: { x: 0.12, y: 0.1 },
  ocean_cliff_top: { x: 0.15, y: 0.13 },
  beach: {
    id: 1,
    x: 0.2,
    y: 0.26,
    grounds: [BlockType.SAND],
    amplitude: {
      low: 0,
      high: 2,
    },
  },
  cliff: {
    id: 3,
    x: 0.3,
    y: 0.33,
    grounds: [BlockType.ROCK],
    amplitude: {
      low: 0,
      high: 2,
    },
  },
  valley: {
    id: 4,
    x: 0.31,
    y: 0.43,
    grounds: [BlockType.GRASS],
    entities: ['apple_tree'],
    amplitude: {
      low: 0,
      high: 20,
    },
  },
  hill: {
    id: 5,
    x: 0.62,
    y: 0.48,
    grounds: [BlockType.ROCK, BlockType.GRASS],
    amplitude: {
      low: 20,
      high: 40,
    },
  },
  peak: {
    id: 6,
    x: 0.75,
    y: 0.53,
    grounds: [BlockType.GRASS],
    amplitude: {
      low: 5,
      high: 20,
    },
  },
  mountain: {
    id: 7,
    x: 0.83,
    y: 0.6,
    grounds: [BlockType.ROCK],
    amplitude: {
      low: 0,
      high: 2,
    },
  },
  high_mountain: {
    id: 8,
    x: 0.88,
    y: 0.85,
    grounds: [BlockType.SNOW],
    amplitude: {
      low: 0,
      high: 2,
    },
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
    grounds: [BlockType.WATER],
    amplitude: {
      low: 0,
      high: 1,
    },
  },
  sea_2: { x: 0.15, y: 0.1 },
  beach: {
    id: 2,
    x: 0.25,
    y: 0.2,
    grounds: [BlockType.ICE],
    amplitude: {
      low: 0,
      high: 3,
    },
  },
  cliff: {
    id: 3,
    x: 0.35,
    y: 0.25,
    grounds: [BlockType.ICE, BlockType.SNOW],
    amplitude: {
      low: 2,
      high: 10,
    },
  },
  cliff_2: { x: 0.45, y: 0.4 },
  lands: {
    id: 4,
    x: 0.5,
    y: 0.4,
    grounds: [BlockType.SNOW, BlockType.ICE],
    entities: ['pine_tree'],
    amplitude: {
      low: 1,
      high: 5,
    },
  },
  mountains: {
    id: 5,
    x: 0.6,
    y: 0.45,
    grounds: [BlockType.SNOW, BlockType.ROCK],
    entities: ['pine_tree'],
    amplitude: {
      low: 5,
      high: 30,
    },
  },
  mountains_top: {
    id: 6,
    x: 0.85,
    y: 0.6,
    grounds: [BlockType.SNOW, BlockType.ROCK],
    amplitude: {
      low: 10,
      high: 40,
    },
  },
  mountains_top_2: { x: 0.9, y: 0.7 },
  mountains_top_3: { x: 0.95, y: 0.75 },
}

const desert = {
  sea_start: {
    id: 0,
    x: 0,
    y: 0,
    grounds: [BlockType.WATER],
    amplitude: {
      low: 0,
      high: 1,
    },
  },
  sea_end: { x: 0.15, y: 0.1 },
  beach: {
    id: 2,
    x: 0.25,
    y: 0.2,
    grounds: [BlockType.SAND],
    amplitude: {
      low: 0,
      high: 3,
    },
  },
  cliff: {
    id: 3,
    x: 0.35,
    y: 0.25,
    grounds: [BlockType.ROCK, BlockType.SAND],
    amplitude: {
      low: 2,
      high: 10,
    },
  },
  dunes: {
    id: 4,
    x: 0.5,
    y: 0.4,
    grounds: [BlockType.SAND],
    amplitude: {
      low: 1,
      high: 10,
    },
  },
  dunes_end: {
    id: 5,
    x: 0.85,
    y: 0.5,
    grounds: [BlockType.SAND, BlockType.ROCK],
    amplitude: {
      low: 5,
      high: 25,
    },
  },
}

export const biome_mapping_conf = { temperate, desert, artic }
