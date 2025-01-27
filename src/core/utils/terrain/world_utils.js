import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  asVect2,
  BlockMode,
  BlocksProcessing,
  getPatchId,
  ProcessingState,
  WorldEnv,
  WorkerPool,
} from '@aresrpg/aresrpg-world'
import { Vector2, Vector3 } from 'three'

import { color_to_block_type, hex_to_int } from './world_settings.js'

/**
 * perform calls in main thread to remain sync and doesn't use caching
 * prefer using async version to avoid performance loss
 */
export function get_nearest_floor_pos(pos) {
  // console.log(`get_nearest_floor_pos: potentially costly, prefer using async version`)
  const requested_pos = new Vector3(pos.x, pos.y, pos.z).floor()
  const blocks_request = BlocksProcessing.getFloorPositions([requested_pos])
  const [floor_block] = blocks_request.process()
  return floor_block.pos
}
/**
 * deferring task execution to allow grouping multiple block requests in same batch
 * @returns
 */
const renew_blocks_processing_request = () => {
  if (WorkerPool.default) {
    const task = BlocksProcessing.getFloorPositions([])
    task.onStarted = () =>
      console.log(
        `run scheduled task with ${task.processingInput.length} blocks`,
      )
    task.defer()
    return task
  } else {
    console.warn(`waiting for workers to be ready`)
  }
}

let blocks_processing_task //= renew_blocks_processing_request()
// console.log(`this line run several time why? isn't top level code supposed to run only once even when module is imported several times?`)

/**
 * better version grouping multiple isolated request in same batch
 */
export async function get_nearest_floor_pos_async(raw_pos) {
  // console.log(`get_nearest_floor_pos`)
  const requested_pos = new Vector3(raw_pos.x, raw_pos.y, raw_pos.z).floor()
  const equal_pos = pos =>
    pos.x === requested_pos.x && pos.z === requested_pos.z
  // try recycling previous task to avoid recreating one for each individual pos request
  const use_previous_task =
    blocks_processing_task?.processingState === ProcessingState.None ||
    blocks_processing_task?.processingState === ProcessingState.Waiting ||
    blocks_processing_task?.processingState === ProcessingState.Scheduled
  blocks_processing_task = use_previous_task
    ? blocks_processing_task
    : renew_blocks_processing_request()
  if (blocks_processing_task) {
    // enqueue pos in current batch
    blocks_processing_task.processingInput.push(requested_pos)
    const batch_res = await blocks_processing_task.promise
    const matching_block = batch_res.find(block => equal_pos(block.pos))
    const surface_block = matching_block?.pos

    if (!surface_block) {
      throw new Error(`No floor found at ${requested_pos}`)
    }

    // console.log(`floor height ${floor_height}`)
    return surface_block
  } else {
    console.warn(`unexpected missing task`)
    // send dummy value until ready
    return 128
  }
}
// export const get_nearest_floor_pos_async = (raw_pos, entity_height = 0) => 128

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

export const to_engine_chunk_format = (
  world_chunk,
  { encode = false } = {},
) => {
  const { id } = world_chunk
  const is_empty = world_chunk.isEmpty()
  const size = world_chunk.extendedDims
  const data = is_empty ? [] : world_chunk.rawData
  const voxels_chunk_data = {
    data: encode ? data.map(chunk_data_encoder) : data,
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
