import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Box3, Color, MathUtils, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import { Biome, PatchCache, BlockType, Heightmap } from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import {
  blocks_colors,
  biome_mapping_conf,
} from '../utils/terrain/world_settings.js'
import { current_three_character } from '../game/game.js'

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
  // init blocks patch cache
  PatchCache.patchSize = Math.pow(2, 6)
  const cache_size = PatchCache.patchSize * 50
  PatchCache.updateCache(new Vector3(), cache_size, true)

  /**
   * Data struct filling from blocks cache
   */
  const map = {
    voxelMaterialsList: Object.values(blocks_colors).map(col => ({
      color: new Color(col),
    })),
    getLocalMapData: async (block_start, block_end) => {
      // TODO make this function run in another thread
      const bbox = new Box3(block_start, block_end)
      const dimensions = bbox.getSize(new Vector3())
      const patch_size = dimensions.x
      const cache = new Uint16Array(dimensions.x * dimensions.y * dimensions.z)
      // const debug_mode = true

      // const is_edge = (row, col, h, patch_size) =>
      //   row === 1 || row === patch_size || col === 1 || col === patch_size
      // || h === 1
      // || h === patch_size - 2

      let is_empty = true

      const fill_blocks_struct = (block_pos, ground_type, buffer_over = []) => {
        const level = MathUtils.clamp(
          block_pos.y + buffer_over.length,
          bbox.min.y,
          bbox.max.y,
        )
        let buff_index = Math.max(level - block_pos.y, 0)
        let h = level - bbox.min.y // local height
        // block_type = local_pos.x === 1 ? BlockType.MUD : block_type
        // block_type = local_pos.z === 1 ? BlockType.MUD : block_type
        // debug_mode && is_edge(local_pos.z, local_pos.x, h, patch_size - 2)
        //   ? BlockType.SAND
        //   : block_cache.type

        while (h >= 0) {
          const cache_index =
            block_pos.z * Math.pow(patch_size, 2) + h * patch_size + block_pos.x
          const block_type =
            buff_index > 0 ? buffer_over[buff_index] : ground_type
          const skip =
            buff_index > 0 &&
            cache[cache_index] !== undefined &&
            !buffer_over[buff_index]
          if (!skip) {
            cache[cache_index] = block_type ? block_type + 1 : BlockType.NONE
          }
          buff_index--
          h--
        }
      }

      const add_ground_blocks = patch => {
        const iter = patch?.blockIterator(true)
        let res = iter.next()
        while (!res.done) {
          const block_data = res.value
          const block_pos = block_data.pos.clone()
          block_pos.x += 1
          block_pos.z += 1
          const block_type = block_data.type
          fill_blocks_struct(block_pos, block_type)
          res = iter.next()
        }
      }

      const add_entities_blocks = patch => {
        // patch.spawned
        const buff_iter = patch.overBlocksIter()
        for (const blk of buff_iter) {
          blk.localPos.x += 1
          blk.localPos.z += 1
          fill_blocks_struct(blk.localPos, blk.type, blk.buffer)
        }
      }

      const add_edges_blocks = () => {
        for (let i = 0; i < patch_size; i++) {
          const xmin = {
            global_pos: new Vector3(bbox.min.x, 0, bbox.min.z + i),
            local_pos: new Vector3(0, 0, i),
          }
          const xmax = {
            global_pos: new Vector3(bbox.max.x, 0, bbox.min.z + i),
            local_pos: new Vector3(patch_size - 1, 0, i),
          }
          const zmin = {
            global_pos: new Vector3(bbox.min.x + i, 0, bbox.min.z),
            local_pos: new Vector3(i, 0, 0),
          }
          const zmax = {
            global_pos: new Vector3(bbox.min.x + i, 0, bbox.max.z),
            local_pos: new Vector3(i, 0, patch_size - 1),
          }
          const edges = [xmin, zmin, xmax, zmax]
          edges.forEach(edge => {
            const block_data = PatchCache.getBlock(edge.global_pos)
            const block_local_pos = edge.local_pos.clone()
            block_local_pos.y = block_data.level
            fill_blocks_struct(block_local_pos, block_data.type)
            // else console.log('missing block: ', edge.pos)
          })
        }
      }

      const patch = PatchCache.cache.find(
        patch =>
          patch.bbox.min.x === bbox.min.x + 1 &&
          patch.bbox.min.z === bbox.min.z + 1 &&
          patch.bbox.max.x === bbox.max.x - 1 &&
          patch.bbox.max.z === bbox.max.z - 1 &&
          patch.bbox.intersectsBox(bbox),
      )

      if (patch) {
        add_ground_blocks(patch)
        // process entities
        add_entities_blocks(patch)
        // fill extra blocks at edges from adjacent patches
        add_edges_blocks()
        is_empty = false
      }
      return {
        data: cache,
        isEmpty: is_empty,
      }
    },
    sampleHeightmap(x, z) {
      const block_pos = new Vector3(x, 128, z)
      let block_level = 0
      let block_type = BlockType.WATER

      const ground_block = PatchCache.getBlock(block_pos)

      if (ground_block) {
        const buff_index = ground_block.buffer.findLastIndex(
          type => type !== BlockType.NONE,
        )
        block_level = ground_block.pos.y
        block_level += buff_index !== -1 ? buff_index : 0
        block_type =
          buff_index !== -1
            ? ground_block.buffer.at(buff_index)
            : ground_block.type
      }
      const block_color = new Color(blocks_colors[block_type])
      return {
        altitude: block_level + 0.25,
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
    tick() {},
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
          // bbox.expandByScalar(2)
          // if (PatchCache.ready) {
          if (PatchCache.updateCache(player_position, cache_size))
            terrain.update()
          // }
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
