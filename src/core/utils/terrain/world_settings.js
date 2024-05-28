import { BlockType } from '@aresrpg/aresrpg-world'

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
}

const temperate = {
  sea: {
    id: 0,
    x: 0,
    y: 0,
    blockType: BlockType.WATER,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  sea_2: { x: 0.18, y: 0.05 },
  beach: {
    id: 2,
    x: 0.26,
    y: 0.21,
    blockType: BlockType.SAND,
    amplitude: {
      low: 0,
      high: 5,
    },
  },
  cliff: {
    id: 3,
    x: 0.33,
    y: 0.23,
    blockType: BlockType.ROCK,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  cliff_2: { x: 0.48, y: 0.42 },
  lands: {
    id: 4,
    x: 0.48,
    y: 0.42,
    blockType: {
      primary: BlockType.GRASS,
      secondary: BlockType.MUD,
    },
    amplitude: {
      low: 0,
      high: 0.2,
    },
    vegetation: ['apple_tree'],
  },
  mountains: {
    id: 5,
    x: 0.71,
    y: 0.52,
    blockType: {
      primary: BlockType.ROCK,
      secondary: BlockType.GRASS,
    },
    amplitude: {
      low: 0,
      high: 25,
    },
    vegetation: ['pine_tree'],
  },
  mountains_top: {
    id: 6,
    x: 0.9,
    y: 0.76,
    blockType: {
      primary: BlockType.SNOW,
      secondary: BlockType.ROCK,
    },
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  mountains_top_2: { x: 0.95, y: 0.92 },
  mountains_top_3: { x: 1, y: 0.9 },
}

const artic = {
  sea: {
    id: 0,
    x: 0,
    y: 0,
    blockType: BlockType.WATER,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  sea_2: { x: 0.18, y: 0.05 },
  beach: {
    id: 2,
    x: 0.26,
    y: 0.21,
    blockType: BlockType.ICE,
    amplitude: {
      low: 0,
      high: 5,
    },
  },
  cliff: {
    id: 3,
    x: 0.33,
    y: 0.23,
    blockType: BlockType.ICE,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  cliff_2: { x: 0.48, y: 0.42 },
  lands: {
    id: 4,
    x: 0.48,
    y: 0.42,
    blockType: BlockType.SNOW,
    amplitude: {
      low: 0,
      high: 0.2,
    },
    vegetation: ['pine_tree'],
  },
  mountains: {
    id: 5,
    x: 0.71,
    y: 0.52,
    blockType: BlockType.SNOW,
    amplitude: {
      low: 0,
      high: 25,
    },
    vegetation: ['pine_tree'],
  },
  mountains_top: {
    id: 6,
    x: 0.9,
    y: 0.76,
    blockType: BlockType.SNOW,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  mountains_top_2: { x: 0.95, y: 0.92 },
  mountains_top_3: { x: 1, y: 0.9 },
}

const desert = {
  sea_start: {
    id: 0,
    x: 0,
    y: 0,
    blockType: BlockType.WATER,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  sea_end: { x: 0.18, y: 0.05 },
  beach: {
    id: 2,
    x: 0.26,
    y: 0.21,
    blockType: BlockType.SAND,
    amplitude: {
      low: 0,
      high: 5,
    },
  },
  cliff: {
    id: 3,
    x: 0.33,
    y: 0.23,
    blockType: BlockType.ROCK,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  dunes: {
    id: 4,
    x: 0.48,
    y: 0.42,
    blockType: BlockType.SAND,
    amplitude: {
      low: 0,
      high: 0,
    },
  },
  dunes_end: {
    id: 5,
    x: 1,
    y: 0.52,
    blockType: BlockType.SAND,
    amplitude: {
      low: 0,
      high: 25,
    },
  },
}

export const biome_mapping_conf = { temperate, desert, artic }
