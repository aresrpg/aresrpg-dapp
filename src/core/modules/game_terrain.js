import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Box3, Color, Vector2, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import { ProcLayer, WorldGenerator } from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import {
  blocks_colors,
  blocks_mapping_conf,
} from '../utils/terrain/world_settings.js'

/** @type {Type.Module} */
export default function () {
  /**
   * Procedural generation
   */
  const world_gen = WorldGenerator.instance
  world_gen.heightmap.params.spreading = 0.42 // (1.42 - 1)
  world_gen.heightmap.sampling.harmonicsCount = 6
  world_gen.amplitude.sampling.seed = 'amplitude_mod'
  // Terrain blocks mapping
  // const sortedItems = Object.values(blocks_mapping_conf).sort(
  //   (item1, item2) => item1.x - item2.x,
  // )
  world_gen.blocksMapping.setMappingRanges(blocks_mapping_conf)
  world_gen.blocksMapping.params.seaLevel = blocks_mapping_conf.beach.x

  const water_material_id = 1
  // Vegetation tree distribution
  const tree_map = new ProcLayer('treemap')
  tree_map.sampling.harmonicsCount = 6 + 1
  tree_map.params.spreading = 0.25 // (1.25 - 1)
  // amplitudeMod.next = treeMap
  // const selection = isNaN(urlParams.layer) ? "all" : ProcGenLayer.layerIndex(urlParams.layer)

  /**
   * Engine
   */
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
      for (const voxel of WorldGenerator.instance.genBlocks(bbox, true)) {
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
      const ground_block = WorldGenerator.instance.getGroundBlock(
        block_pos,
        true,
      )
      const block_color = new Color(blocks_colors[ground_block.type])
      return {
        altitude: ground_block.pos.y + 0.25,
        color: block_color,
      }
    },
  }

  const terrain = new Terrain(map)
  terrain.parameters.voxels.map.minAltitude = 0
  terrain.parameters.voxels.map.maxAltitude = 400
  // let last_regen = 0
  // const regen_delay = 1000
  return {
    tick() {
      // if (WorldGenerator.instance.needsRegen) {
      //   const current_time = Date.now()
      //   if (current_time - last_regen >= regen_delay) {
      //     console.log(`regen terrain`)
      //     last_regen = current_time
      //     WorldGenerator.instance.needsRegen = false
      //     terrain.clear()
      //   }
      // }
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
