import { on } from 'events'
import { setInterval } from 'timers/promises'

import { TerrainViewer, VoxelmapViewer } from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import {
  Camera,
  Color,
  Frustum,
  Matrix4,
  PerspectiveCamera,
  Vector3,
} from 'three'
import { VoxelmapVisibilityComputer } from '@aresrpg/aresrpg-engine/dist/terrain/voxelmap/voxelmap-visibility-computer.js'

import { current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import {
  blocks_colors,
  world_cache_size,
} from '../utils/terrain/world_settings.js'

const worker_url = new URL('./world_cache_worker', import.meta.url)

function compute_camera_frustum(/** @type PerspectiveCamera */ camera) {
  camera.updateMatrix()
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()

  return new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  )
}

export class CacheWorker {
  static singleton
  cache_worker
  count = 0
  resolvers = {}

  constructor() {
    this.cache_worker = new Worker(worker_url, { type: 'module' })
    this.cache_worker.onmessage = ({ data }) => {
      this.resolvers[data.id](data)
      delete this.resolvers[data.id] // Prevent memory leak
    }
  }

  static get instance() {
    CacheWorker.singleton = CacheWorker.singleton || new CacheWorker()
    return CacheWorker.singleton
  }

  callApi(api, args) {
    const id = this.count++
    this.cache_worker.postMessage({ id, api, args })
    // Send id and task to WebWorker
    return new Promise(resolve => (this.resolvers[id] = resolve))
  }
}

/** @type {Type.Module} */
export default function () {
  /**
   * Data struct filling from blocks cache
   */
  const map = {
    minAltitude: -1,
    maxAltitude: 400,
    voxelMaterialsList: Object.values(blocks_colors).map(col => ({
      color: new Color(col),
    })),
    getLocalMapData: async (block_start, block_end) => {
      const res = await CacheWorker.instance.callApi('getChunk', [
        block_start,
        block_end,
      ])
      const cache = res.data
      return {
        data: cache,
        size: new Vector3().subVectors(block_end, block_start),
        isEmpty: cache.length === 0,
      }
    },
    async sampleHeightmap(coords) {
      return Promise.all(
        coords.map(async ({ x, z }) => {
          const res = await CacheWorker.instance.callApi('getBlock', [x, z])
          const block = res.data
          const block_level = block.top_level
          const block_type = block.type
          const block_color = new Color(blocks_colors[block_type])
          return {
            altitude: block_level + 0.25,
            color: block_color,
          }
        }),
      )
    },
  }

  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(map.minAltitude / patch_size.y)
  const max_patch_id_y = Math.floor(map.maxAltitude / patch_size.y)
  const voxelmap_viewer = new VoxelmapViewer(
    min_patch_id_y,
    max_patch_id_y,
    map.voxelMaterialsList,
    { patchSize: patch_size },
  )
  const terrain_viewer = new TerrainViewer(map, voxelmap_viewer)
  terrain_viewer.parameters.lod.enabled = false

  const voxelmap_visibility_computer = new VoxelmapVisibilityComputer(
    { x: patch_size.xz, y: patch_size.y, z: patch_size.xz },
    min_patch_id_y,
    max_patch_id_y,
  )

  CacheWorker.instance
    .callApi('updateCache', [new Vector3(), world_cache_size / 5])
    .then(res => {
      terrain_viewer.update()
    })

  // let last_regen = 0
  // const regen_delay = 1000
  return {
    tick() {
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state }) {
      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready
      events.emit('CHUNKS_LOADED')

      scene.add(terrain_viewer.container)

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        async (
          { last_view_distance, last_far_view_distance },
          [
            {
              settings: { view_distance, far_view_distance },
            },
          ],
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
          CacheWorker.instance
            .callApi('updateCache', [player_position])
            .then(res => {
              if (res.data.cacheRefreshed) {
                terrain_viewer.update()
              }
            })

          // compute all patches that need to be visible and prioritize them
          voxelmap_visibility_computer.reset()
          voxelmap_visibility_computer.showMapAroundPosition(
            player_position,
            state.settings.view_distance,
            compute_camera_frustum(camera),
          )
          const requested_patches_ids_list = voxelmap_visibility_computer
            .getRequestedPatches()
            .map(requested_patch => requested_patch.id)

          // declare them as visible, hide the others
          voxelmap_viewer.setVisibility(requested_patches_ids_list)

          // filter the patches_ids that need computing and data from the map
          const patches_ids_list = requested_patches_ids_list.filter(patch_id =>
            voxelmap_viewer.doesPatchRequireVoxelsData(patch_id),
          )

          // for each of these patches
          for (const patch_id of patches_ids_list) {
            // query the map (asynchronous) to get data for this patch
            const block_box = voxelmap_viewer.getPatchVoxelsBox(patch_id)
            const chunkdata_promise = map.getLocalMapData(
              block_box.min,
              block_box.max,
            )

            // once we got data for this patch
            chunkdata_promise.then(chunkdata => {
              // check if the engine still needs this data (this second check is required because we got the data asynchronously)
              if (voxelmap_viewer.doesPatchRequireVoxelsData(patch_id)) {
                // if needed, add it to the queue so that the voxelmap_viewer can compute a mesh asap.
                voxelmap_viewer.enqueuePatch(patch_id, chunkdata)
              }
            })
          }
        }
      })
    },
  }
}
