import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import { BlockMode, GroundCache, WorldEnv } from '@aresrpg/aresrpg-world'
import { Vector2 } from 'three'

// import * as WorldUtils from '@aresrpg/aresrpg-world/worldUtils'
import { color_to_block_type, hex_to_int } from './world_settings.js'
const cache_query_params = { cacheMissing: true, precacheRadius: 10 }

/**
 * Sync or async ground height
 * @param {*} pos vector 2
 * @returns ground height if available or promise if block not yet in cache
 */
export function get_ground_height(pos) {
  const ground_block = GroundCache.instance.queryPrecachedBlock(
    pos,
    cache_query_params,
  )
  return ground_block instanceof Promise
    ? ground_block.then(block => block?.pos?.y ?? 100)
    : ground_block.pos.y
}

/**
 * Sync only
 * @param {*} param0
 * @param {*} entity_height
 * @returns height if in cache or NaN
 */
export function get_ground_height_sync({ x, z }, entity_height = 0) {
  const ground_height = get_ground_height(new Vector2(x, z))
  return ground_height instanceof Promise
    ? NaN
    : ground_height + entity_height * 0.5
}

/**
 * Async version
 * @param {*} param0
 * @param {*} entity_height
 * @returns async height
 */
export async function get_ground_height_async({ x, z }, entity_height = 0) {
  const ground_height = await get_ground_height(new Vector2(x, z))
  return ground_height + entity_height * 0.5
}

export const get_sea_level = () => WorldEnv.current.seaLevel

export function map_blocks_to_type(biome) {
  return Object.entries(biome).reduce((acc, [key, value]) => {
    // Check if type and subtype are numbers (color or BlockType IDs)
    const type =
      typeof value.type === 'string'
        ? color_to_block_type[hex_to_int(value.type)]
        : value.type
    const subtype =
      typeof value.subtype === 'string'
        ? color_to_block_type[hex_to_int(value.subtype)]
        : value.subtype

    // If we get undefined, fallback to original value (in case mapping fails)
    return {
      ...acc,
      [key]: {
        ...value,
        type: type !== undefined ? type : value.type,
        subtype: subtype !== undefined ? subtype : value.subtype,
      },
    }
  }, {})
}

/**
 * Chunks related
 */

export const chunk_data_encoder = (val, mode = BlockMode.REGULAR) =>
  val
    ? voxelmapDataPacking.encode(mode === BlockMode.CHECKERBOARD, val)
    : voxelmapDataPacking.encodeEmpty()

export const to_engine_chunk_format = world_chunk => {
  const { id } = world_chunk
  const is_empty = world_chunk.isEmpty()
  const size = world_chunk.extendedDims
  const data = is_empty ? [] : world_chunk.rawData
  const voxels_chunk_data = {
    data,
    isEmpty: is_empty,
    size,
    dataOrdering: 'zxy',
  }
  const engine_chunk = {
    id,
    voxels_chunk_data,
  }
  return engine_chunk
}
