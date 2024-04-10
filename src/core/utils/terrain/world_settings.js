import { BlockType } from '@aresrpg/aresrpg-world'

export const blocks_colors = {
  [BlockType.NONE]: 0x000000,
  [BlockType.WATER]: 0x74ccf4,
  [BlockType.SAND]: 0xc2b280,
  [BlockType.GRASS]: 0x41980a,
  [BlockType.DRY_GRASS]: 0x41980a, // TODO
  [BlockType.MUD]: 0x41980a, // TODO
  [BlockType.ROCK]: 0xababab,
  [BlockType.SNOW]: 0xe5e5e5,
}

/**
 * terrain height mapping to block type
 */
export const terrain_mapping = {
  sea: {
    blockType: BlockType.WATER,
    threshold: 0,
    randomness: {
      low: 0,
      high: 0,
    },
  },
  beach: {
    blockType: BlockType.SAND,
    threshold: 75,
    randomness: {
      low: 0,
      high: 5,
    },
  },
  cliff: {
    blockType: BlockType.ROCK,
    threshold: 84,
    randomness: {
      low: 0,
      high: 0,
    },
  },
  lowlands: {
    blockType: BlockType.DRY_GRASS,
    threshold: 106,
    randomness: {
      low: 8,
      high: 0,
    },
  },
  highlands: {
    blockType: BlockType.GRASS,
    threshold: 125,
    randomness: {
      low: 0,
      high: 15,
    },
  },
  mountains: {
    blockType: BlockType.ROCK,
    threshold: 150,
    randomness: {
      low: 0,
      high: 20,
    },
  },
  mountains_top: {
    blockType: BlockType.SNOW,
    threshold: 185,
    randomness: {
      low: 25,
      high: 0,
    },
  },
}
