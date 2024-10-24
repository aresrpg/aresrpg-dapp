import { BiomeType, BlockType } from '@aresrpg/aresrpg-world'

import { biome_flora_collections } from './biomes_flora.js'
import { SCHEMPACKS } from './world_schem_conf.js'
import { block_type } from './world_static_conf.js'

const TREES = SCHEMPACKS.TREES.types
const { alpine, temperate_forest, siberian } = biome_flora_collections

export const biomes_landscapes_default = {
  [BiomeType.Temperate]: {},
  [BiomeType.Artic]: {},
  [BiomeType.Desert]: {},
}

/**
 * Temperate landscapes
 */

const temperate = biomes_landscapes_default[BiomeType.Temperate]
temperate.SEA = {
  x: 0,
  y: 0,
  type: BlockType.WATER,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 2,
}
temperate.SEA_END = { x: 0.18, y: 0.05 }
temperate.BEACH = {
  x: 0.26,
  y: 0.21,
  type: BlockType.SAND,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 5,
}
temperate.CLIFF = {
  x: 0.33,
  y: 0.23,
  type: BlockType.ROCK,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 0,
}
temperate.CLIFF_END = { x: 0.48, y: 0.42 }
temperate.LANDS = {
  x: 0.48,
  y: 0.42,
  type: BlockType.GRASS,
  subtype: BlockType.MUD,
  fadeIn: 0,
  fadeOut: 0.2,
  flora: { ...temperate_forest.medium },
}
temperate.MOUNTAINS_LOW = {
  x: 0.68,
  y: 0.48,
  type: BlockType.ROCK,
  subtype: BlockType.ROCK,
  mixratio: 0.1,
  fadeIn: 0,
  fadeOut: 25,
  flora: { ...alpine.medium, ...alpine.low },
}
temperate.MOUNTAINS = {
  x: 0.8,
  y: 0.62,
  type: BlockType.ROCK,
  subtype: BlockType.ROCK,
  mixratio: 0.1,
  fadeIn: 0,
  fadeOut: 25,
  flora: { ...alpine.small, [TREES.SpruceTree]: 1 },
}
temperate.MOUNTAINS_PEAK = {
  id: 6,
  x: 0.9,
  y: 0.76,
  type: BlockType.SNOW,
  subtype: BlockType.ROCK,
  fadeIn: 0,
  fadeOut: 0,
}
temperate.MOUNTAINS_PEAK_2 = { x: 0.95, y: 0.92 }
temperate.MOUNTAINS_PEAK_3 = { x: 1, y: 0.9 }

/**
 * Artic landscapes
 */
const artic = biomes_landscapes_default[BiomeType.Artic]

artic.SEA = {
  id: 0,
  x: 0,
  y: 0,
  type: BlockType.WATER,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 1,
}
artic.SEA_END = { x: 0.18, y: 0.05 }
artic.BEACH = {
  id: 2,
  x: 0.26,
  y: 0.21,
  type: BlockType.ICE,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 3,
}
artic.CLIFF = {
  id: 3,
  x: 0.33,
  y: 0.23,
  type: BlockType.SNOW,
  subtype: BlockType.ICE,
  mixratio: 0.25,
  fadeIn: 2,
  fadeOut: 10,
}
artic.CLIFF_END = { x: 0.48, y: 0.42 }
artic.LANDS = {
  id: 4,
  x: 0.48,
  y: 0.42,
  type: BlockType.SNOW,
  subtype: BlockType.ICE,
  fadeIn: 1,
  fadeOut: 5,
  flora: { ...temperate_forest.medium },
}
artic.MOUNTAINS = {
  id: 5,
  x: 0.71,
  y: 0.45,
  type: BlockType.SNOW,
  subtype: BlockType.ROCK,
  fadeIn: 5,
  fadeOut: 30,
  flora: { ...siberian.medium },
}
artic.MOUNTAINS_MIDDLE = {
  id: 6,
  x: 0.85,
  y: 0.65,
  type: BlockType.SNOW,
  subtype: BlockType.ROCK,
  fadeIn: 10,
  fadeOut: 40,
  flora: { ...alpine.small, [TREES.SpruceTree]: 3 },
}
artic.MOUNTAINS_PEAK = { x: 0.95, y: 0.7 }
artic.END = { x: 1, y: 0.7 }

/**
 * Desert landscapes
 */

const desert = biomes_landscapes_default[BiomeType.Desert]

desert.SEA = {
  id: 0,
  x: 0,
  y: 0,
  type: BlockType.WATER,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 1,
}
desert.SEA_END = { x: 0.18, y: 0.05 }
desert.BEACH = {
  id: 2,
  x: 0.26,
  y: 0.21,
  type: BlockType.SAND,
  subtype: BlockType.NONE,
  fadeIn: 0,
  fadeOut: 3,
}
desert.CLIFF = {
  id: 3,
  x: 0.33,
  y: 0.23,
  type: BlockType.ROCK,
  subtype: BlockType.SAND,
  fadeIn: 2,
  fadeOut: 10,
}
desert.DUNES = {
  id: 4,
  x: 0.48,
  y: 0.42,
  type: BlockType.SAND,
  subtype: BlockType.NONE,
  fadeIn: 1,
  fadeOut: 10,
}
desert.DUNES_END = {
  id: 5,
  x: 1,
  y: 0.52,
  type: BlockType.SAND,
  subtype: BlockType.ROCK,
  fadeIn: 5,
  fadeOut: 25,
}
