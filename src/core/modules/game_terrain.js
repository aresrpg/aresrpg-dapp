import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Color, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'

import { abortable } from '../utils/iterator.js'
import {
  blocks_colors,
  world_cache_size,
} from '../utils/terrain/world_settings.js'
import { current_three_character } from '../game/game.js'

const worker_url = new URL('./world_cache_worker', import.meta.url)

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

  const terrain = new Terrain(map)
  terrain.parameters.voxels.map.minAltitude = 0
  terrain.parameters.voxels.map.maxAltitude = 400

  CacheWorker.instance
    .callApi('updateCache', [new Vector3(), world_cache_size / 5])
    .then(res => {
      terrain.update()
    })

  // let last_regen = 0
  // const regen_delay = 1000
  return {
    tick() {
      // terrain.update()
    },
    observe({ camera, events, signal, scene, get_state }) {
      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready
      events.emit('CHUNKS_LOADED')

      scene.add(terrain.container)

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
                terrain.update()
              }
            })
          terrain.showMapAroundPosition(
            player_position,
            state.settings.view_distance,
          )
          terrain.setLod(camera.position, 50, camera.far)
          // }
        }
      })
    },
  }
}
