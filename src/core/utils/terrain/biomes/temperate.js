import { BlockType } from '@aresrpg/aresrpg-world/biomes'

import { BLOCKS } from '../blocks.js'

export default {
  deep_ocean: {
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 2,
  },
  ocean_cliff: { x: 0.12, y: 0.1 },
  beach: {
    x: 0.2,
    y: 0.26,
    type: BlockType.SAND,
    subtype: BLOCKS.WET_SAND,
    fadeIn: 5,
    fadeOut: 5,
    flora: {
      'trees/palmtree_big_1': 1,
      'trees/palmtree_big_2': 5,
      'trees/palmtree_big_3': 5,
      'rocks/boulder_small_1': 1,
      'rocks/boulder_small_2': 1,
      'rocks/boulder_small_3': 1,
      void: 40,
    },
  },
  beach_land: {
    x: 0.25,
    y: 0.33,
    type: BLOCKS.GOLDEN_SAND,
    subtype: BLOCKS.WET_SAND,
    fadeIn: 5,
    fadeOut: 5,
    flora: {
      'trees/palmtree_1': 1,
      'trees/palmtree_2': 1,
      'trees/palmtree_3': 1,
      'trees/palmtree_4': 1,
      'trees/palmtree_5': 1,
      'trees/palmtree_6': 1,
      'trees/palmtree_7': 1,
      'trees/palmtree_8': 1,
      'trees/palmtree_9': 1,
      void: 20,
    },
  },
  cliff: {
    x: 0.3,
    y: 0.34,
    type: BlockType.ROCK,
    subtype: BlockType.ROCK,
    fadeIn: 1,
    fadeOut: 1,
  },
  valley: {
    x: 0.32,
    y: 0.41,
    type: BlockType.GRASS,
    subtype: BlockType.MUD,
    fadeIn: 0,
    fadeOut: 0,
  },
  hill: {
    x: 0.62,
    y: 0.5,
    type: BlockType.GRASS,
    subtype: BlockType.ROCK,
    fadeIn: 2,
    fadeOut: 2,
  },
  mountain: {
    x: 0.7,
    y: 0.7,
    type: BLOCKS.LUSH_GRASS,
    subtype: BLOCKS.GRANIT,
    fadeIn: 10,
    fadeOut: 5,
  },
  plateau: {
    x: 0.82,
    y: 0.64,
    type: BLOCKS.VIBRANT_GRASS,
    subtype: BLOCKS.MOSSY_GRASS,
    fadeIn: 2,
    fadeOut: 2,
  },
  high_mountain: {
    x: 0.88,
    y: 0.85,
    type: BLOCKS.BASALT,
    subtype: BlockType.ROCK,
    fadeIn: 0,
    fadeOut: 0,
  },
  high_plateau: {
    x: 0.95,
    y: 0.98,
    type: BLOCKS.VIBRANT_GRASS,
    subtype: BLOCKS.BASALT,
    fadeIn: 0,
    fadeOut: 2,
  },
}

// export default {
//   deep_ocean: {
//     id: 0,
//     x: 0,
//     y: 0,
//     type: BlockType.WATER,
//     subtype: BlockType.ROCK,
//     fadeIn: 0,
//     fadeOut: 2,
//   },
//   ocean_cliff_bottom: { x: 0.12, y: 0.1 },
//   ocean_cliff_top: { x: 0.15, y: 0.13 },
//   beach: {
//     id: 1,
//     x: 0.2,
//     y: 0.26,
//     type: BlockType.SAND,
//     subtype: BlockType.ROCK,
//     fadeIn: 0,
//     fadeOut: 2,
//   },
//   cliff: {
//     id: 3,
//     x: 0.25,
//     y: 0.33,
//     type: BlockType.ROCK,
//     subtype: BlockType.ROCK,
//     fadeIn: 0,
//     fadeOut: 2,
//   },
//   valley: {
//     id: 4,
//     x: 0.31,
//     y: 0.43,
//     type: BlockType.GRASS,
//     subtype: BlockType.ROCK,
//     fadeIn: 0,
//     fadeOut: 20,
//     flora: { ...SCHEMATICS_COLLECTIONS.trees_tropical_beach },
//   },
//   hill: {
//     id: 5,
//     x: 0.62,
//     y: 0.48,
//     type: BlockType.GRASS,
//     subtype: BlockType.ROCK,
//     mixratio: 0.1,
//     fadeIn: 20,
//     fadeOut: 40,
//   },
//   peak: {
//     id: 6,
//     x: 0.75,
//     y: 0.53,
//     type: BlockType.GRASS,
//     subtype: BlockType.MUD,
//     fadeIn: 5,
//     fadeOut: 20,
//   },
//   mountain: {
//     id: 7,
//     x: 0.83,
//     y: 0.6,
//     type: BlockType.ROCK,
//     subtype: BlockType.ROCK,
//     fadeIn: 0,
//     fadeOut: 2,
//   },
//   high_mountain: {
//     id: 8,
//     x: 0.88,
//     y: 0.85,
//     type: BlockType.SNOW,
//     subtype: BlockType.ROCK,
//     fadeIn: 0,
//     fadeOut: 2,
//   },
//   top_plateau: { x: 0.95, y: 0.98 },
// }

// const artic = biomes_landscapes_custom[BiomeType.Artic]
// artic.sea = {
//   id: 0,
//   x: 0,
//   y: 0,
//   type: BlockType.WATER,
//   subtype: BlockType.NONE,
//   fadeIn: 0,
//   fadeOut: 1,
// }
// artic.sea_2 = { x: 0.15, y: 0.1 }
// artic.beach = {
//   id: 2,
//   x: 0.25,
//   y: 0.2,
//   type: BlockType.ICE,
//   subtype: BlockType.NONE,
//   fadeIn: 0,
//   fadeOut: 3,
// }
// artic.cliff = {
//   id: 3,
//   x: 0.35,
//   y: 0.25,
//   type: BlockType.SNOW,
//   subtype: BlockType.ICE,
//   mixratio: 0.25,
//   fadeIn: 2,
//   fadeOut: 10,
// }
// artic.cliff_2 = { x: 0.45, y: 0.4 }
// artic.lands = {
//   id: 4,
//   x: 0.5,
//   y: 0.4,
//   type: BlockType.SNOW,
//   subtype: BlockType.ICE,
//   flora: { [TREES]: 1 },
//   fadeIn: 1,
//   fadeOut: 5,
// }
// artic.mountains = {
//   id: 5,
//   x: 0.6,
//   y: 0.45,
//   type: BlockType.SNOW,
//   subtype: BlockType.ROCK,
//   flora: { [TREES.SpruceTree]: 1 },
//   fadeIn: 5,
//   fadeOut: 30,
// }
// artic.mountains_top = {
//   id: 6,
//   x: 0.85,
//   y: 0.6,
//   type: BlockType.SNOW,
//   subtype: BlockType.ROCK,
//   fadeIn: 10,
//   fadeOut: 40,
// }
// artic.mountains_top_2 = { x: 0.9, y: 0.7 }
// artic.mountains_top_3 = { x: 0.95, y: 0.75 }

// /**
//  * Desert landscapes
//  */

// const desert = biomes_landscapes_custom[BiomeType.Desert]

// desert.sea_start = {
//   id: 0,
//   x: 0,
//   y: 0,
//   type: BlockType.WATER,
//   subtype: BlockType.NONE,
//   fadeIn: 0,
//   fadeOut: 1,
// }
// desert.sea_end = { x: 0.15, y: 0.1 }
// desert.beach = {
//   id: 2,
//   x: 0.25,
//   y: 0.2,
//   type: BlockType.SAND,
//   subtype: BlockType.NONE,
//   fadeIn: 0,
//   fadeOut: 3,
// }
// desert.cliff = {
//   id: 3,
//   x: 0.35,
//   y: 0.25,
//   type: BlockType.ROCK,
//   subtype: BlockType.SAND,
//   fadeIn: 2,
//   fadeOut: 10,
// }
// desert.dunes = {
//   id: 4,
//   x: 0.5,
//   y: 0.4,
//   type: BlockType.SAND,
//   subtype: BlockType.NONE,
//   fadeIn: 1,
//   fadeOut: 10,
// }
// desert.dunes_end = {
//   id: 5,
//   x: 0.85,
//   y: 0.5,
//   type: BlockType.SAND,
//   subtype: BlockType.ROCK,
//   fadeIn: 5,
//   fadeOut: 25,
// }
