import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import {
  WorldUtils,
  WorldEnv,
  ProcessingTask,
  LowerChunksBatch,
  UpperChunksBatch,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, combine, typed_on } from '../utils/iterator.js'
import { to_engine_chunk_format } from '../utils/terrain/world_utils.js'
import { world_shared_setup } from '../utils/terrain/world_setup.js'
import { FLAGS, LOD_MODE } from '../utils/terrain/setup.js'
import { voxel_engine_setup } from '../utils/terrain/engine_setup.js'

async function compressBuffer(buffer) {
  const stream = new ReadableStream({
    type: 'bytes',
    start(controller) {
      controller.enqueue(new Uint8Array(buffer))
      controller.close()
    },
  })
  const readableCompressionStream = stream.pipeThrough(
    new CompressionStream('gzip'),
  )
  const response = new Response(readableCompressionStream)
  return await response.arrayBuffer()
}

async function decompressBuffer(buffer) {
  const stream = new ReadableStream({
    type: 'bytes',
    start(controller) {
      controller.enqueue(new Uint8Array(buffer))
      controller.close()
    },
  })
  const readableDecompressionStream = stream.pipeThrough(
    new DecompressionStream('gzip'),
  )
  const response = new Response(readableDecompressionStream)
  return await response.arrayBuffer()
}

function bytesToString(bytes) {
  if (bytes < 1024) {
    return `${bytes}B`
  }
  bytes /= 1024
  if (bytes < 1024) {
    return `${bytes}KB`
  }
  bytes /= 1024
  if (bytes < 1024) {
    return `${bytes}MB`
  }
  return `${bytes}GB`
}

const compressionStats = {
  totalUncompressedSize: 0,
  totalCompressedSize: 0,
  totalTestedArraybuffersCount: 0,
  minUncompressedSize: Infinity,
  maxUncompressedSize: -Infinity,
  minCompressedSize: Infinity,
  maxCompressedSize: -Infinity,
  maxCompressionRatio: Infinity,
  minCompressionRatio: -Infinity,
}

window.setInterval(() => {
  const uncompressed = {
    average:
      compressionStats.totalUncompressedSize /
      compressionStats.totalTestedArraybuffersCount,
    min: compressionStats.minUncompressedSize,
    max: compressionStats.maxUncompressedSize,
  }
  const compressed = {
    average:
      compressionStats.totalCompressedSize /
      compressionStats.totalTestedArraybuffersCount,
    min: compressionStats.minCompressedSize,
    max: compressionStats.maxCompressedSize,
  }

  console.log(`Compression stats:
- tested ${compressionStats.totalTestedArraybuffersCount} arraybuffers
- uncompressed:
  - average size: ${bytesToString(uncompressed.average)}
  - min size:     ${bytesToString(uncompressed.min)}
  - max size:     ${bytesToString(uncompressed.max)}
- compressed:
  - average size: ${bytesToString(compressed.average)}\t${((100 * compressed.average) / uncompressed.average).toFixed(1)} %
  - min size:     ${bytesToString(compressed.min)}\t${((100 * compressed.min) / uncompressed.min).toFixed(1)} %
  - max size:     ${bytesToString(compressed.max)}\t${((100 * compressed.max) / uncompressed.max).toFixed(1)} %
`)
}, 1000)

async function testBuffer(sourceBuffer) {
  const uncompressedByteLength = sourceBuffer.byteLength
  compressionStats.minUncompressedSize = Math.min(
    uncompressedByteLength,
    compressionStats.minUncompressedSize,
  )
  compressionStats.maxUncompressedSize = Math.max(
    uncompressedByteLength,
    compressionStats.maxUncompressedSize,
  )
  compressionStats.totalUncompressedSize += uncompressedByteLength

  const compressedArrayBuffer = await compressBuffer(sourceBuffer.slice())
  const compressedByteLength = compressedArrayBuffer.byteLength
  compressionStats.minCompressedSize = Math.min(
    compressedByteLength,
    compressionStats.minCompressedSize,
  )
  compressionStats.maxCompressedSize = Math.max(
    compressedByteLength,
    compressionStats.maxCompressedSize,
  )
  compressionStats.totalCompressedSize += compressedByteLength

  const compressionRatio =
    compressionStats.totalCompressedSize /
    compressionStats.totalUncompressedSize
  compressionStats.maxCompressionRatio = Math.min(
    compressionRatio,
    compressionStats.maxCompressionRatio,
  )
  compressionStats.minCompressionRatio = Math.max(
    compressionRatio,
    compressionStats.minCompressionRatio,
  )

  const decompressedBuffer = await decompressBuffer(compressedArrayBuffer)
  const decompressedByteLength = decompressedBuffer.byteLength

  if (decompressedByteLength !== uncompressedByteLength) {
    throw new Error(
      `Compression/decompression went wrong: Decompressed length = ${decompressedByteLength} (expected ${uncompressedByteLength})`,
    )
  }
  const sourceUint8 = new Uint8Array(sourceBuffer)
  const decompressedUint8 = new Uint8Array(decompressedBuffer)
  if (sourceUint8.length !== decompressedUint8.length) {
    throw new Error()
  }
  for (let i = 0; i < sourceUint8.length; i++) {
    if (sourceUint8[i] !== decompressedUint8[i]) {
      throw new Error(`Compression/decompression went wrong: data changed`)
    }
  }

  compressionStats.totalTestedArraybuffersCount++
}

/** @type {Type.Module} */
export default function () {
  // world setup (main thread environement)
  world_shared_setup()
  ProcessingTask.initWorkerPool()
  // engine setup
  const { terrain_viewer, voxelmap_viewer } = voxel_engine_setup()

  // chunks batch processing
  const lower_chunks_batch = new LowerChunksBatch()
  const upper_chunks_batch = new UpperChunksBatch()

  return {
    tick() {
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state, physics }) {
      const chunksSentToEngine = new Map()

      const render_world_chunk = world_chunk => {
        const engine_chunk = to_engine_chunk_format(world_chunk)
        voxelmap_viewer.invalidatePatch(engine_chunk.id)
        if (voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id)) {
          voxelmap_viewer.enqueuePatch(
            engine_chunk.id,
            engine_chunk.voxels_chunk_data,
          )

          const chunkIdString = `${engine_chunk.id.x}_${engine_chunk.id.y}_${engine_chunk.id.z}`
          if (!chunksSentToEngine.has(chunkIdString)) {
            chunksSentToEngine.set(chunkIdString, 1)
          } else {
            const alreadySendsCount = chunksSentToEngine.get(chunkIdString)
            chunksSentToEngine.set(chunkIdString, alreadySendsCount + 1)
            console.log(
              `Chunk ${chunkIdString} was already sent ${alreadySendsCount} times.`,
            )
          }

          ;(async () => {
            if (engine_chunk.voxels_chunk_data.isEmpty) {
              return
            }
            void testBuffer(engine_chunk.voxels_chunk_data.data.buffer.slice())
          })()
        }

        physics.voxelmap_collider.setChunk(
          engine_chunk.id,
          engine_chunk.voxels_chunk_data,
        )
      }

      const on_chunks_processed = chunks =>
        chunks?.forEach(chunk => {
          render_world_chunk(chunk)
        })

      lower_chunks_batch.onTaskCompleted = on_chunks_processed
      upper_chunks_batch.onTaskCompleted = on_chunks_processed

      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready

      scene.add(terrain_viewer.container)

      aiter(abortable(typed_on(events, 'STATE_UPDATED', { signal }))).reduce(
        async (
          { last_view_distance, last_far_view_distance },
          { settings: { view_distance, far_view_distance } },
        ) => {
          if (last_view_distance) {
            if (
              last_view_distance !== view_distance ||
              last_far_view_distance !== far_view_distance
            ) {
              // await reset_chunks(true)
            }
          }

          return {
            last_view_distance: view_distance,
            last_far_view_distance: far_view_distance,
          }
        },
      )

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()
        const player_position =
          current_three_character(state)?.position?.clone()
        if (player_position) {
          const current_pos = player_position.clone().floor()
          // Query chunks around player position
          const view_center = WorldUtils.convert.asVect2(current_pos).floor()
          const view_far = state.settings.view_distance
          const view_near = WorldEnv.current.nearViewDist
          if (upper_chunks_batch.isSyncNeeded(view_center, view_far)) {
            lower_chunks_batch.syncView(view_center, view_near)
            upper_chunks_batch.syncView(view_center, view_far)
            voxelmap_viewer.setVisibility(upper_chunks_batch.chunkIds)
          }
          // Board
        }
        FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
          terrain_viewer.setLod(camera.position, 50, camera.far)
      })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal })),
      ).forEach(chunks => chunks.forEach(render_world_chunk))

      aiter(abortable(setInterval(200, null))).reduce(async () => {
        voxelmap_viewer.setAdaptativeQuality({
          distanceThreshold: 75,
          cameraPosition: camera.getWorldPosition(new Vector3()),
        })
      })
    },
  }
}
