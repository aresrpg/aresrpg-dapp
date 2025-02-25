import {
  BlocksProcessing,
  ProcessingState,
  BlockMode,
  parseChunkKey,
  parseThreeStub,
} from '@aresrpg/aresrpg-world'
import { Vector3 } from 'three'
import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import { WorkerPool } from '@aresrpg/aresrpg-world/workerpool'
import { world_settings } from '@aresrpg/aresrpg-sdk/world'

/**
 * performs individual block processing call synchroneously in main thread (without cache)
 * prefer using batch async version to improve performances
 */
export function get_nearest_floor_pos({ x, y, z }) {
  // console.log(`get_nearest_floor_pos: potentially costly, prefer using async version`)
  const requested_pos = new Vector3(x, y + 1, z).floor()
  const [{ pos }] = BlocksProcessing.getFloorPositions([
    requested_pos,
  ]).process()

  // it is important to return null here as if the query fails, we want to know it failed instead of returning a wrong value
  if (pos.y < 10) return null
  return pos
}

export const default_worker_pool = new WorkerPool()

default_worker_pool.init(1)
await default_worker_pool.loadWorldEnv(world_settings.rawSettings)

/**
 * deferring task execution to allow grouping multiple block requests in same batch
 * @returns
 */
const renew_blocks_processing_request = () => {
  const task = BlocksProcessing.getFloorPositions([])
  task.onStarted = () =>
    console.log(`run scheduled task with ${task.processingInput.length} blocks`)
  task.defer()
  return task
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

export function chunk_data_encoder(value, mode = BlockMode.REGULAR) {
  if (value)
    return voxelmapDataPacking.encode(mode === BlockMode.CHECKERBOARD, value)
  return voxelmapDataPacking.encodeEmpty()
}

export function to_engine_chunk_format({ metadata, rawdata }) {
  const data = rawdata.map(chunk_data_encoder)

  return {
    id: parseChunkKey(metadata.chunkKey),
    voxels_chunk_data: {
      data,
      size: parseThreeStub(metadata.bounds)
        .clone()
        .expandByScalar(metadata.margin)
        .getSize(new Vector3()),
      dataOrdering: 'zxy',
      isEmpty: !rawdata.length,
    },
  }
}
