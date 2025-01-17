import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  asVect2,
  BlockMode,
  BlockProcessor,
  BlocksProcessing,
  BlocksProcessingRecipe,
  getPatchId,
  ProcessingState,
  WorldEnv,
} from '@aresrpg/aresrpg-world'
import { Vector2, Vector3 } from 'three'

import { color_to_block_type, hex_to_int } from './world_settings.js'

/**
 * perform call directly in main thread to remain sync
 * prefer using async version to avoid performance loss
 */
export function get_nearest_floor_pos(pos, entity_height = 0) {
  console.log(`get_nearest_floor_pos: warn costly, prefer using async version`)
  const requested_pos = new Vector3(pos.x, pos.y, pos.z).floor()
  const block_request = new BlockProcessor(requested_pos)
  const floor_block = block_request.getFloorBlock()
  // console.log(floor_block.pos.y)
  return floor_block.pos.y + entity_height * 0.5
}

const renew_blocks_processing_request = () => {
  const blocks_processing_req = new BlocksProcessing([])
  blocks_processing_req.processingParams = {
    recipe: BlocksProcessingRecipe.Floor,
  }
  blocks_processing_req.deferProcessing().then(task => {
    console.log(
      `run scheduled processing task with ${task.input.length} blocks`,
    )
  })
  return blocks_processing_req
}

let blocks_processing_request = renew_blocks_processing_request()

/**
 * optimized version running in worker at the cost of being async
 */
export async function get_nearest_floor_pos_async(raw_pos, entity_height = 0) {
  // console.log(`get_nearest_floor_pos`)
  const requested_pos = new Vector3(raw_pos.x, raw_pos.y, raw_pos.z).floor()
  const equal_pos = pos =>
    pos.x === requested_pos.x && pos.z === requested_pos.z
  // check if previous request is still in waiting state to use it or create another
  const renewal_needed =
    blocks_processing_request.processingState !== ProcessingState.Waiting
  blocks_processing_request = renewal_needed
    ? renew_blocks_processing_request()
    : blocks_processing_request
  // enqueue pos in current task
  blocks_processing_request.input.push(requested_pos)
  const batch_res = await blocks_processing_request.deferredPromise
  const matching_block = batch_res.find(block => equal_pos(block.pos))
  const floor_height = matching_block?.pos?.y

  if (!floor_height) {
    throw new Error(`No floor found at ${requested_pos}`)
  }

  // console.log(`floor height ${floor_height}`)
  return floor_height + entity_height * 0.5
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
  const view_center = getPatchId(asVect2(view_pos), patch_dims)
  const view_far = getPatchId(new Vector2(view_dist), patch_dims).x
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
