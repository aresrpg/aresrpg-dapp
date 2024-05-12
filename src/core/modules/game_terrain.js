import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Box3, Color, Vector2, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import { ProcGenLayer, WorldGenerator } from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import { current_three_character } from '../game/game.js'
import proc_layers_json from '../../assets/terrain/proc_gen.json'
import {
  blocks_colors,
  terrain_mapping,
} from '../utils/terrain/world_settings.js'

/** @type {Type.Module} */
export default function () {
  const noise_scale = 1 / 8
  const proc_layers = ProcGenLayer.fromJsonConfig({
    procLayers: proc_layers_json.noise_panels,
  })
  const selection = ProcGenLayer.layerIndex(0)
  WorldGenerator.instance.config = {
    selection,
    samplingScale: noise_scale,
    procLayers: proc_layers,
    terrainBlocksMapping: Object.values(terrain_mapping),
    seaLevel: 76,
  }

  const water_material_id = 1
  const map = {
    voxelMaterialsList: Object.values(blocks_colors).map(col => ({
      color: new Color(col),
    })),
    getLocalMapData: async (block_start, block_end) => {
      // TODO make this function run in another thread
      const block_size = new Vector3().subVectors(block_end, block_start)
      const cache = new Uint16Array(block_size.x * block_size.y * block_size.z)

      const index_factor = {
        x: 1,
        y: block_size.x,
        z: block_size.x * block_size.y,
      }

      const build_index = position => {
        if (position.x < 0 || position.y < 0 || position.z < 0) {
          throw new Error()
        }
        return (
          position.x * index_factor.x +
          position.y * index_factor.y +
          position.z * index_factor.z
        )
      }

      let is_empty = true
      const bbox = new Box3(block_start, block_end)
      for (const voxel of WorldGenerator.instance.generate(bbox, false)) {
        if (voxel.type !== water_material_id) {
          const local_position = new Vector3().subVectors(
            voxel.pos,
            block_start,
          )
          const cache_index = build_index(local_position)
          cache[cache_index] = 1 + voxel.type
          is_empty = false
        }
      }

      return {
        data: cache,
        isEmpty: is_empty,
      }
    },
    sampleHeightmap(x, z) {
      const block_level =
        WorldGenerator.instance.getHeight(new Vector2(x, z)) - 1
      const block_pos = new Vector3(x, block_level, z)
      const block_type = WorldGenerator.instance.getBlockType(block_pos)
      const block_color = new Color(blocks_colors[block_type])
      let altitude = block_level + 1
      if (block_type === water_material_id) {
        altitude = -1
      }

      return {
        altitude,
        color: block_color,
      }
    },
  }

  const terrain = new Terrain(map)

  return {
    tick() {
      terrain.update()
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
          terrain.showMapAroundPosition(
            player_position,
            state.settings.view_distance,
          )
        }

        terrain.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
