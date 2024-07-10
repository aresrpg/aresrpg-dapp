import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  TerrainViewer,
  VoxelmapViewer,
  VoxelmapVisibilityComputer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import {
  Color,
  Frustum,
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from 'three'
import {
  Biome,
  BlockType,
  Heightmap,
  PatchBaseCache,
  PatchBlocksCache,
  PatchCache,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import {
  biome_mapping_conf,
  blocks_colors,
  world_patch_size,
} from '../utils/terrain/world_settings.js'
import { fill_chunk_from_patch } from '../utils/terrain/chunk_utils.js'

const worker_url = new URL('./world_cache_worker', import.meta.url)

function compute_camera_frustum(
  /** @type PerspectiveCamera | OrthographicCamera */ camera,
) {
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

// const patchRenderQueue = []
let patch_cache_lookup = {}

export class CacheSyncProvider {
  static singleton
  cache_worker
  count = 0
  resolvers = {}

  constructor() {
    this.cache_worker = new Worker(worker_url, { type: 'module' })
    this.cache_worker.onmessage = ({ data }) => {
      if (data.id !== undefined) {
        this.resolvers[data.id](data)
        delete this.resolvers[data.id]
      } else {
        if (data) {
          data.kept?.length > 0 && PatchBlocksCache.cleanDeprecated(data.kept)
          data.created?.forEach(blocks_cache => {
            const blocks_patch = new PatchBlocksCache(blocks_cache)
            PatchBlocksCache.instances.push(blocks_patch)
            // patchRenderQueue.push(blocksPatch)
          })
        }
      }
    }
  }

  static get instance() {
    CacheSyncProvider.singleton =
      CacheSyncProvider.singleton || new CacheSyncProvider()
    return CacheSyncProvider.singleton
  }

  callApi(api, args) {
    const id = this.count++
    this.cache_worker.postMessage({ id, api, args })
    return new Promise(resolve => (this.resolvers[id] = resolve))
  }
}

const voxel_materials_list = Object.values(blocks_colors).map(col => ({
  color: new Color(col),
}))
const min_altitude = -1
const max_altitude = 400

/** @type {Type.Module} */
export default function () {
  // TODO: remove temporary workaround
  // restore LOD using duplicated instance of the world
  PatchCache.patchSize = world_patch_size
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.setMappings(biome_mapping_conf)
  Biome.instance.params.seaLevel = biome_mapping_conf.temperate.beach.x
  PatchBaseCache.cacheRadius = 20
  /**
   * Data struct filling from blocks cache
   */
  const map = {
    minAltitude: min_altitude,
    maxAltitude: max_altitude,
    voxelMaterialsList: voxel_materials_list,
    getLocalMapData: async (block_start, block_end) => {
      return {
        data: [],
        size: new Vector3().subVectors(block_end, block_start),
        isEmpty: true,
      }
    },
    async sampleHeightmap(coords) {
      return Promise.all(
        coords.map(async ({ x, z }) => {
          const block_pos = new Vector3(x, 0, z)
          const block = PatchBlocksCache.getBlock(block_pos)
          let block_level = 0
          let block_type = BlockType.WATER
          if (block) {
            block_level = block?.pos.y // block.top_level
            block_type = block.type
          } else {
            // TODO: remove temporary workaround to have LOD back:
            const biome_type = Biome.instance.getBiomeType(block_pos)
            const raw_val = Heightmap.instance.getRawVal(block_pos)
            const block_types = Biome.instance.getBlockType(raw_val, biome_type)
            block_level = Heightmap.instance.getGroundLevel(
              block_pos,
              raw_val,
              biome_type,
            )
            ;[block_type] = block_types.grounds
          }
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
  const min_patch_id_y = Math.floor(min_altitude / patch_size.y)
  const max_patch_id_y = Math.floor(max_altitude / patch_size.y)
  const voxelmap_viewer = new VoxelmapViewer(
    min_patch_id_y,
    max_patch_id_y,
    voxel_materials_list,
    {
      patchSize: patch_size,
      computationOptions: {
        method: EComputationMethod.CPU_MULTITHREADED,
        threadsCount: 4,
      },
    },
  )
  const terrain_viewer = new TerrainViewer(map, voxelmap_viewer)
  terrain_viewer.parameters.lod.enabled = true

  const voxelmap_visibility_computer = new VoxelmapVisibilityComputer(
    { x: patch_size.xz, y: patch_size.y, z: patch_size.xz },
    min_patch_id_y,
    max_patch_id_y,
  )

  const get_patch_block = (x, z) => {
    const block_pos = new Vector3(x, 128, z)
    let ground_level = 0
    let extra_level = 0
    let block_type = BlockType.WATER

    const ground_block = PatchBlocksCache.getBlock(block_pos)

    if (ground_block) {
      const buff_index = ground_block.buffer.findLastIndex(
        type => type !== BlockType.NONE,
      )
      ground_level = ground_block.pos.y
      extra_level = buff_index !== -1 ? buff_index : 0
      block_type =
        buff_index !== -1
          ? ground_block.buffer.at(buff_index)
          : ground_block.type
    }
    // console.log(`${x} ${ground_block.pos.y} ${z} ${ground_level}`)
    const block = {
      type: block_type,
      ground_level,
      top_level: ground_level + extra_level,
    }
    return block
  }

  const find_cached_patch = chunk_bbox => {
    // const res = PatchBlocksCache.instances.find(
    //   patch =>
    //     patch.bbox.min.x >= chunk_bbox.min.x + 1 &&
    //     patch.bbox.max.x <= chunk_bbox.max.x - 1 &&
    //     ((chunk_bbox.min.y >= patch.bbox.min.y - 1 &&
    //       chunk_bbox.min.y <= patch.bbox.max.y + 1) ||
    //       (chunk_bbox.max.y >= patch.bbox.min.y - 1 &&
    //         chunk_bbox.max.y <= patch.bbox.max.y + 1)) &&
    //     chunk_bbox.max.y >= patch.bbox.max.y - 1 &&
    //     patch.bbox.min.z >= chunk_bbox.min.z + 1 &&
    //     patch.bbox.max.z <= chunk_bbox.max.z - 1,
    // )
    const center = chunk_bbox.getCenter(new Vector3())
    center.y = 100
    const res = PatchBlocksCache.instances.find(
      patch =>
        patch.bbox.intersectsBox(chunk_bbox) &&
        center.x > patch.bbox.min.x &&
        center.x < patch.bbox.max.x &&
        center.z > patch.bbox.min.z &&
        center.z < patch.bbox.max.z,
    )
    return res
  }

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
          CacheSyncProvider.instance
            .callApi('updateCache', [player_position])
            .then(res => {
              if (res.data.cacheRefreshed) {
                console.log(`[MainThread] back from cache update`)
                // reset cache indexing
                patch_cache_lookup = {}
                // feed_engine()
                // terrain_viewer.update()
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

          requested_patches_ids_list.forEach(patch_id => {
            const patch_key = patch_id.asString
            const cached_patch = patch_cache_lookup[patch_key]
            if (!cached_patch && cached_patch !== null) {
              const chunk_bbox = voxelmap_viewer.getPatchVoxelsBox(patch_id)
              const cached_patch = find_cached_patch(chunk_bbox)
              patch_cache_lookup[patch_key] = cached_patch || null
            }
          })

          const available_patch_keys = requested_patches_ids_list.filter(
            key => patch_cache_lookup[key.asString],
          )

          const available = Object.values(patch_cache_lookup).filter(
            patch => patch,
          )
          const missing = Object.values(patch_cache_lookup).filter(
            patch => !patch,
          )
          console.log(
            ` available patches: ${available.length}, missing patches: ${missing.length}`,
          )
          // console.log(patch_cache_lookup)

          // declare them as visible, hide the others
          voxelmap_viewer.setVisibility(available_patch_keys)

          // filter the patches_ids that need computing and data from the map
          const patches_ids_list = available_patch_keys.filter(patch_id =>
            voxelmap_viewer.doesPatchRequireVoxelsData(patch_id),
          )

          for (const patch_id of patches_ids_list) {
            const patch_key = patch_id.asString
            const chunk_bbox = voxelmap_viewer.getPatchVoxelsBox(patch_id)
            const cached_patch = patch_cache_lookup[patch_key]
            // fill chunk from patch
            const data = fill_chunk_from_patch(cached_patch, chunk_bbox)
            const size = Math.round(Math.pow(data.length, 1 / 3))
            const dimensions = new Vector3(size, size, size)
            const chunk = { data, size: dimensions, isEmpty: false }
            // feed engine with chunk
            voxelmap_viewer.enqueuePatch(patch_id, chunk)
            // query the map (asynchronous) to get data for this patch
            // const chunkdata_promise = map.getLocalMapData(
            //   block_box.min,
            //   block_box.max,
            // )
            // // once we got data for this patch
            // chunkdata_promise.then(chunkdata => {
            //   // check if the engine still needs this data (this second check is required because we got the data asynchronously)
            //   if (voxelmap_viewer.doesPatchRequireVoxelsData(patch_id)) {
            //     // if needed, add it to the queue so that the voxelmap_viewer can compute a mesh asap.
            //     voxelmap_viewer.enqueuePatch(patch_id, chunkdata)
            //   }
            // })
          }
        }
      })
    },
  }
}
