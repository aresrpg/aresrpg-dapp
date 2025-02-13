import {
  asVect2,
  BlocksProcessing,
  getPatchId,
  ProcessingState,
  WorldEnv,
  WorkerPool,
  BlockMode,
} from '@aresrpg/aresrpg-world'
import { Vector2, Vector3 } from 'three'
import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'

/**
 * performs individual block processing call synchroneously in main thread (without cache)
 * prefer using batch async version to improve performances
 */
export function get_nearest_floor_pos(pos) {
  // console.log(`get_nearest_floor_pos: potentially costly, prefer using async version`)
  const requested_pos = new Vector3(pos.x, pos.y, pos.z).floor()
  const [floor_block] = BlocksProcessing.getFloorPositions([
    requested_pos,
  ]).process()
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

/**
 * async version grouping multiple isolated requests in same batch
 * and running in separate worker
 */
export async function get_nearest_floor_pos_async(raw_pos) {
  // console.log(`get_nearest_floor_pos`)
  const requested_pos = new Vector3(raw_pos.x, raw_pos.y, raw_pos.z).floor()
  const equal_pos = pos =>
    pos.x === requested_pos.x && pos.z === requested_pos.z
  // try recycling previous task to avoid recreating one each time a block request is received
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

    return surface_block
  } else {
    console.warn(`unexpected missing task`)
    // send dummy value until ready
    return 128
  }
}

export const get_sea_level = () => WorldEnv.current.seaLevel

export function get_view_settings(view_pos, view_dist) {
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

export function chunk_data_encoder(value, mode = BlockMode.REGULAR) {
  if (value)
    return voxelmapDataPacking.encode(mode === BlockMode.CHECKERBOARD, value)
  return voxelmapDataPacking.encodeEmpty()
}

export function to_engine_chunk_format(world_chunk, { encode = false } = {}) {
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
