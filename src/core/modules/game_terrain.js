import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Box3, Color, MathUtils, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import {
  Biome,
  BlocksPatch,
  BlockType,
  DevHacks,
  Heightmap,
} from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import {
  blocks_colors,
  biome_mapping_conf,
} from '../utils/terrain/world_settings.js'

/** @type {Type.Module} */
export default function () {
  /**
   * Procedural generation setup
   */
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.setMappings(biome_mapping_conf)
  Biome.instance.params.seaLevel = biome_mapping_conf.temperate.beach.x
  // WIP
  BlocksPatch.updateCache()

  /**
   * Blocks gen
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

      const debug_mode = false

      const is_edge = (row, col, h, patch_size) =>
        row === 1 ||
        row === patch_size - 2 ||
        col === 1 ||
        col === patch_size - 2 ||
        h === 1 ||
        h === patch_size - 2

      let is_empty = true
      const bbox = new Box3(block_start, block_end)
      // for (const voxel of WorldGenerator.instance.genBlocks(bbox, true)) {
      //   const local_position = new Vector3().subVectors(voxel.pos, block_start)
      //   const cache_index = build_index(local_position)
      //   cache[cache_index] = 1 + voxel.type
      //   is_empty = false
      // }
      const patch = BlocksPatch.cache.find(
        patch =>
          patch.bbox.min.x === bbox.min.x &&
          patch.bbox.min.z === bbox.min.z &&
          patch.bbox.max.x === bbox.max.x &&
          patch.bbox.max.z === bbox.max.z &&
          patch.bbox.intersectsBox(bbox),
      )

      if (patch) {
        console.log(`matching patch`, patch.bbox)
        // const intersection = patch.bbox.clone().intersect(bbox)
        const patch_size = patch.dimensions.x
        const iter = patch?.blockIterator(true)
        let res = iter.next()
        while (!res.done) {
          const { pos, data } = res.value
          const level = MathUtils.clamp(
            data.level + data.overground.length,
            bbox.min.y,
            bbox.max.y,
          )
          let buff_index = Math.max(level - data.level, 0)
          let h = level - bbox.min.y // local height
          const block_type =
            debug_mode && is_edge(pos.z, pos.x, h, patch_size)
              ? BlockType.SAND
              : data.type
          const overbuffer = data.overground.map(type =>
            type ? type + 1 : type,
          )
          while (h > 0) {
            const cache_index =
              pos.z * Math.pow(patch_size, 2) + h * patch_size + pos.x
            cache[cache_index] =
              buff_index > 0 ? overbuffer[buff_index] : block_type + 1
            buff_index--
            h--
          }
          res = iter.next()
        }

        is_empty = false
      }
      return {
        data: cache,
        isEmpty: is_empty,
      }
    },
    sampleHeightmap(x, z) {
      const block_pos = new Vector3(x, 0, z)
      const ground_block = Heightmap.instance.getGroundBlock(
        block_pos,
        undefined,
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

        terrain.setLod(camera.position, 50, 500)
      })
    },
  }
}
