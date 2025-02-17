import { Vector2, Vector3 } from 'three'
import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  asVect2,
  parseChunkKey,
  parseThreeStub,
  getPatchId,
  BlockMode,
  BlocksProcessing,
  ProcessingState,
  ChunksPolling,
  WorkerPool,
} from '@aresrpg/aresrpg-world'

import { color_to_block_type, hex_to_int } from './world_settings.js'
import { world_shared_env } from './world_setup.js'
// @ts-ignore
// import chunks_service_worker_url from './chunks_polling_worker.js?url&worker'

const world_env_settings = world_shared_env.rawSettings // getWorldDemoEnvSettings()

/**
 * Global purpose workerpool for handling tasks like:
 *  individual blocks, board processing
 */

const create_default_workerpool = () => {
  const default_worker_pool = new WorkerPool()
  default_worker_pool.init(1)
  default_worker_pool.loadWorldEnv(world_env_settings).then(() => {
    console.log(`default workerpool ready`)
  })
  return default_worker_pool
}

export const shared_worker_pool = create_default_workerpool()

/**
 * performs individual block processing call synchroneously in main thread (without cache)
 * prefer using batch async version to improve performances
 */
export function get_nearest_floor_pos(pos) {
  // console.log(`get_nearest_floor_pos: potentially costly, prefer using async version`)
  const requested_pos = new Vector3(pos.x, pos.y + 1, pos.z).floor()
  const [floor_block] = BlocksProcessing.getFloorPositions([
    requested_pos,
  ]).process()
  if (floor_block.pos.y <= 10) {
    console.warn(
      `abnormal height ${floor_block.pos.y} (original height ${pos.y})`,
    )
    floor_block.pos.y = 10
  }
  return floor_block.pos
}
/**
 * deferring task execution to allow grouping multiple block requests in same batch
 * @returns
 */
const renew_blocks_processing_request = () => {
  if (shared_worker_pool.ready) {
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

    // console.log(`floor height ${floor_height}`)
    return surface_block
  } else {
    console.warn(`unexpected missing task`)
    // send dummy value until ready
    return 128
  }
}
// export const get_nearest_floor_pos_async = (raw_pos, entity_height = 0) => 128

export const get_sea_level = () => world_shared_env.getSeaLevel()

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

export const encode_chunk_rawdata = rawdata => rawdata.map(chunk_data_encoder)

export const format_chunk_data = (chunk_data, { encode = false } = {}) => {
  const { metadata, rawdata } = chunk_data
  const id = parseChunkKey(metadata.chunkKey)
  const bounds = parseThreeStub(metadata.bounds)
  const extended_bounds = bounds.clone().expandByScalar(metadata.margin)
  const size = extended_bounds.getSize(new Vector3())
  const data = metadata.isEmpty
    ? []
    : encode
      ? encode_chunk_rawdata(rawdata)
      : rawdata
  const voxels_chunk_data = {
    data,
    size,
    dataOrdering: 'zxy',
    isEmpty: metadata.isEmpty,
  }
  const engine_chunk = {
    id,
    voxels_chunk_data,
  }
  return engine_chunk
}

/**
 * Polling chunks either from remote or local source
 */

export const init_chunks_polling_service = () => {
  const is_remote_available = false
  const chunks_polling = new ChunksPolling()
  const get_visible_chunk_ids = chunks_polling.getVisibleChunkIds

  // create workerpool to produce chunks locally
  const chunks_processing_worker_pool = new WorkerPool()
  chunks_processing_worker_pool.init(4)
  chunks_processing_worker_pool.loadWorldEnv(world_env_settings).then(() => {
    console.log(`local chunks workerpool ready`)
    // configure to poll chunks from local source
    chunks_polling.chunksWorkerPool = chunks_processing_worker_pool
    // skip compression for local gen
    chunks_polling.skipBlobCompression = true
  })

  // this will look for chunks depending on current view state
  const poll_chunks = (current_pos, view_dist) => {
    // make sure service is available either from remote or local source
    if (is_remote_available || chunks_polling.chunksWorkerPool) {
      const patch_dims = world_shared_env.getPatchDimensions() // WorldEnv.current.patchDimensions
      const view_pos = getPatchId(asVect2(current_pos), patch_dims)
      const view_range = getPatchId(new Vector2(view_dist), patch_dims).x
      return chunks_polling.pollChunks(view_pos, view_range)
    }
    return null
  }
  return { poll_chunks, get_visible_chunk_ids }
}
