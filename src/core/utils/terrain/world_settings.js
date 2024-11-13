import { BiomeType, BlockType } from '@aresrpg/aresrpg-world/biomes'
import { WorldConf } from '@aresrpg/aresrpg-world'

import { map_blocks_to_type } from './world_utils.js'
import TEMPERATE from './biomes/temperate.js'
import { BLOCKS } from './blocks.js'

// World static config override
WorldConf.patchPowSize = 6 // as a power of two (6 => 64 blocks)

// TODO: remove hardcoding and retrieve dynamic value from world
export const sea_level = 76

// Convert hex string to number
const hex_to_int = hex => parseInt(hex.replace('#', ''), 16)

// Extract unique colors from block definitions
const unique_block_colors = [...new Set(Object.values(BLOCKS))]

// Generate new block type entries for each unique color
const additional_block_types = unique_block_colors.reduce(
  (color_mapping, color, index) => ({
    ...color_mapping,
    [BlockType.LAST_PLACEHOLDER + index]: hex_to_int(color),
  }),
  {},
)

// Schematics blocks mapping as NUMBER (block type) to NUMBER (color)
// { 0: 0x000000 }
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

  ...additional_block_types,
}

// Create a reverse mapping from color to block type id for efficient lookup
export const color_to_block_type = Object.entries(BLOCKS_COLOR_MAPPING).reduce(
  (type_lookup, [type_id, color]) => ({
    ...type_lookup,
    [color]: +type_id,
  }),
  {},
)

// TODO: maybe this is not needed and could be ignored in the world?
const ignored_blocks = [
  'air',
  'jungle_fence',
  'grass',
  'player_wall_head',
  'cobbled_deepslate',
  'iron_trapdoor',
  'iron_bars',
  'stick',
  'stone_brick_slab',
]

// Schematics blocks mapping as STRING (block name) to NUMBER (block type)
// { 'air': 0 }
export const SCHEMATICS_BLOCKS_MAPPING = {
  air: BlockType.NONE,
  ...Object.fromEntries(
    ignored_blocks.map(block_name => [block_name, BlockType.NONE]),
  ),
  ...Object.entries(BLOCKS).reduce(
    (block_mappings, [block_name, color]) => ({
      ...block_mappings,
      [block_name.toLowerCase()]: color_to_block_type[hex_to_int(color)],
    }),
    {},
  ),
}

export const LANDSCAPE = {
  [BiomeType.Temperate]: map_blocks_to_type(TEMPERATE),
  [BiomeType.Artic]: map_blocks_to_type(TEMPERATE),
  [BiomeType.Desert]: map_blocks_to_type(TEMPERATE),
}
