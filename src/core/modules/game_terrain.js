import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Box3, Color, Vector2, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import { ProcGenLayer, WorldGenerator } from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import { current_character } from '../game/game.js'
import proc_layers_json from '../../assets/terrain/proc_gen.json'
// import biome_layers_json from '../../assets/terrain/biome_layers.json'
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
  // const biome_layers = ProcGenLayer.fromJsonConfig({
  //   procLayers: biome_layers_json.noise_panels,
  // })
  const selection = ProcGenLayer.layerIndex(0)
  WorldGenerator.instance.config = {
    selection,
    samplingScale: noise_scale,
    procLayers: proc_layers,
    biomaps: proc_layers, // TODO use dedicated biome maps
    terrainBlocksMapping: Object.values(terrain_mapping),
    seaLevel: 76,
  }

  WorldGenerator.instance.parent = {}
  WorldGenerator.instance.parent.onChange = originator => {
    // console.log(originator)
    WorldGenerator.instance.needsRegen = true
  }

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
      for (const voxel of WorldGenerator.instance.generateChunk(bbox)) {
        const local_position = new Vector3().subVectors(voxel.pos, block_start)
        const cache_index = build_index(local_position)
        cache[cache_index] = 1 + voxel.type
        is_empty = false
      }

      return {
        data: cache,
        isEmpty: is_empty,
      }
    },
    sampleHeightmap(x, z) {
      const block_pos = new Vector3(x, 0, z)
      const block_level = WorldGenerator.instance.getHeight(block_pos) - 1
      block_pos.y = block_level
      const block_type = WorldGenerator.instance.getBlockType(block_pos)
      const block_color = new Color(blocks_colors[block_type])
      return {
        altitude: block_level + 1,
        color: block_color,
      }
    },
  }

  const terrain = new Terrain(map)
  let last_regen = 0
  const regen_delay = 1000
  return {
    tick() {
      if (WorldGenerator.instance.needsRegen) {
        const current_time = Date.now()
        if (current_time - last_regen >= regen_delay) {
          console.log(`regen terrain`)
          last_regen = current_time
          WorldGenerator.instance.needsRegen = false
          terrain.clear()
        }
      }
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
        const player = current_character(state)

        if (player.position) {
          terrain.showMapAroundPosition(
            player.position,
            state.settings.view_distance,
          )
        }

        terrain.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
