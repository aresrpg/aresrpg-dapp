import { on } from 'events'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Box3, Color, MathUtils, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import {
  Biome,
  BlocksPatch,
  BlockType,
  Heightmap,
} from '@aresrpg/aresrpg-world'

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
  // TODO update while player moves
  BlocksPatch.gridRadius = 18
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

      // const highlight_global_x = (
      //   xrow = patch_size,
      //   blockType = BlockType.MUD,
      // ) => {
      //   // fill extra blocks at edges from adjacent patches
      //   for (let i = 0; i <= 63; i++) {
      //     const edge_x = new Vector3(xrow, 0, bbox.min.z + i)
      //     const blockCache = BlocksPatch.getBlock(edge_x)
      //     blockCache.type = blockType
      //   }
      // }

      // const highlight_local_x = (
      //   patch,
      //   xrow = patch_size,
      //   blockType = BlockType.MUD,
      // ) => {
      //   for (let i = 0; i <= 63; i++) {
      //     const local_x = new Vector3(xrow, 0, i)
      //     const blockCache = patch.getBlock(local_x)
      //     blockCache.type = blockType
      //   }
      // }

      const fill_struct = (block_cache, local_pos) => {
        const level = MathUtils.clamp(
          block_cache.level + block_cache.overground.length,
          bbox.min.y,
          bbox.max.y,
        )
        let buff_index = Math.max(level - block_cache.level, 0)
        let h = level - bbox.min.y // local height
        const block_type = block_cache.type
        // debug_mode && is_edge(local_pos.z, local_pos.x, h, patch_size - 2)
        //   ? BlockType.SAND
        //   : block_cache.type
        const overbuffer = block_cache.overground.map(type =>
          type ? type + 1 : type,
        )
        // if (h > 0 && overbuffer > 0) {
        //   local_pos.y = block_cache.level
        //   console.log(local_pos, h)
        //   tree_blocks++
        // }
        // blocks_count += h > 0 ? 1 : 0

        while (h >= 0) {
          const cache_index =
            local_pos.z * Math.pow(patch_size, 2) + h * patch_size + local_pos.x
          cache[cache_index] =
            buff_index > 0 ? overbuffer[buff_index] : block_type + 1
          buff_index--
          h--
        }
      }

      const fill_extra_edges = () => {
        for (let i = 0; i < patch_size; i++) {
          const xmin = {
            src_global: new Vector3(bbox.min.x, 0, bbox.min.z + i),
            dst_local: new Vector3(0, 0, i),
          }
          const xmax = {
            src_global: new Vector3(bbox.max.x, 0, bbox.min.z + i),
            dst_local: new Vector3(patch_size - 1, 0, i),
          }
          const zmin = {
            src_global: new Vector3(bbox.min.x + i, 0, bbox.min.z),
            dst_local: new Vector3(i, 0, 0),
          }
          const zmax = {
            src_global: new Vector3(bbox.min.x + i, 0, bbox.max.z),
            dst_local: new Vector3(i, 0, patch_size - 1),
          }
          const edges = [xmin, xmax, zmin, zmax]
          edges.forEach(edge => {
            const block_cache = BlocksPatch.getBlock(edge.src_global)
            if (block_cache) fill_struct(block_cache, edge.dst_local)
            // else console.log('missing block: ', edge.pos)
          })
        }
      }

      const patch = BlocksPatch.cache.find(
        patch =>
          patch.bbox.min.x === bbox.min.x + 1 &&
          patch.bbox.min.z === bbox.min.z + 1 &&
          patch.bbox.max.x === bbox.max.x - 1 &&
          patch.bbox.max.z === bbox.max.z - 1 &&
          patch.bbox.intersectsBox(bbox),
      )

      if (patch) {
        // highlight_global_x(bbox.min.x + 1, BlockType.MUD)
        // highlight_local_x(patch, 64, BlockType.SNOW)
        const iter = patch?.blockIterator(true)
        const blocks_count = 0
        const tree_blocks = 0
        let res = iter.next()
        while (!res.done) {
          const { pos: local_pos, cache: block_cache } = res.value
          fill_struct(block_cache, local_pos.clone().addScalar(1))
          res = iter.next()
        }
        // fill extra blocks at edges from adjacent patches
        fill_extra_edges()

        console.log(
          `${blocks_count} blocks (${tree_blocks} trees) on patch`,
          patch.bbox,
        )
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
      if (
        BlocksPatch.bbox.containsPoint(block_pos) &&
        block_pos.x !== BlocksPatch.bbox.max.x &&
        block_pos.z !== BlocksPatch.bbox.max.z
      ) {
        const ground_block = BlocksPatch.getBlock(block_pos)
        // Heightmap.instance.getGroundBlock(
        //   block_pos,
        //   undefined,
        //   true,
        // )
        if (ground_block) {
          const block_index = ground_block.overground.findLastIndex(
            type => type !== BlockType.NONE,
          )
          block_level = ground_block.level
          block_level += block_index !== -1 ? block_index : 0
          block_type =
            block_index !== -1
              ? ground_block.overground.at(block_index)
              : ground_block.type
        } else {
          // console.log("missing ground block: ", block_pos)
          BlocksPatch.getBlock(block_pos)
        }
        // else if (x > -range && x < range && z > -range && z < range) {
        //   console.log(block_pos)
        // }
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
