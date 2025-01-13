import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  BlockMode,
  BlockProcessor,
  WorldEnv,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Vector2 } from 'three'

// import * as WorldUtils from '@aresrpg/aresrpg-world/worldUtils'
import { color_to_block_type, hex_to_int } from './world_settings.js'

/**
 *
 */
export function get_nearest_floor_pos(requested_pos, entity_height = 0) {
  // perform call directly in main thread to remain sync
  // use lightly to avoid performance loss
  const block_request = new BlockProcessor(
    WorldUtils.convert.asVect2(requested_pos),
  )
  const floor_block = block_request.getFloorBlock()
  // console.log(floor_block.pos.y)
  return floor_block.pos.y + entity_height * 0.5
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

export const get_view_settings = (view_pos, view_dist) => {
  const patch_dims = WorldEnv.current.patchDimensions
  const view_center = WorldUtils.convert.getPatchId(
    WorldUtils.convert.asVect2(view_pos),
    patch_dims,
  )
  const view_far = WorldUtils.convert.getPatchId(
    new Vector2(view_dist),
    patch_dims,
  ).x
  const view_near = Math.min(view_far, WorldEnv.current.patchViewCount.near)
  const view_settings = {
    center: view_center,
    near: view_near,
    far: view_far,
  }
  return view_settings
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
