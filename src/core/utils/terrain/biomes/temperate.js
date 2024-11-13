import { BlockType } from '@aresrpg/aresrpg-world/biomes'

import { SCHEMATICS_COLLECTIONS } from '../schematics_collections.js'

export default {
  deep_ocean: {
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.ROCK,
    fadeIn: 0,
    fadeOut: 2,
  },
  beach: {
    x: 0.1,
    y: 0.12,
    type: BlockType.SAND,
    subtype: BlockType.ROCK,
    fadeIn: 0,
    fadeOut: 2,
    flora: { ...SCHEMATICS_COLLECTIONS.beach_house },
  },
  valley: {
    x: 0.7,
    y: 0.7,
    type: BlockType.GRASS,
    subtype: BlockType.ROCK,
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
