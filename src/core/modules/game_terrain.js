import { on } from 'events'
import { setInterval } from 'timers/promises'

import { to_chunk_position } from '@aresrpg/aresrpg-protocol'
import { aiter } from 'iterator-helper'
import { Box3, Color, Vector2, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine'
import { ProcGenLayer, BlockType, WorldGenerator } from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import { current_character } from '../game/game.js'
import proc_layers_json from '../../assets/terrain/proc_gen.json'

const block_types_mapping = height => {
  if (height < 75) return BlockType.WATER
  else if (height < 80) return BlockType.SAND
  else if (height < 125) return BlockType.GRASS
  else if (height < 175) return BlockType.ROCK
  return BlockType.SNOW
}

const block_types_color_mapping = {
  [BlockType.NONE]: 0x000000,
  [BlockType.ROCK]: 0xababab,
  [BlockType.GRASS]: 0x41980a,
  [BlockType.SNOW]: 0xe5e5e5,
  [BlockType.WATER]: 0x74ccf4,
  [BlockType.SAND]: 0xc2b280,
}

// kept for backward compat with engine
// TODO replace or move
class VoxelMap {
  size
  worldGen
  constructor(bbox, world_gen) {
    this.size = bbox.getSize(new Vector3())
    this.worldGen = world_gen
  }

  voxelMaterialsList = Object.values(this.getAllVoxelMaterials())

  getAllVoxelMaterials() {
    const blocks_colors = Object.values(block_types_color_mapping).map(col => ({
      color: new Color(col),
    }))
    return blocks_colors
  }

  getMaxVoxelsCount(from, to) {
    const bmin = new Vector3(from.x, from.y, from.z)
    const bmax = new Vector3(to.x, to.y, to.z)
    const bbox = new Box3(bmin, bmax)
    const count = this.worldGen.estimatedVoxelsCount(bbox)
    return count
  }

  *iterateOnVoxels(from, to) {
    const bmin = new Vector3(from.x, from.y, from.z)
    const bmax = new Vector3(to.x, to.y, to.z)
    const bbox = new Box3(bmin, bmax)
    const iter = this.worldGen.generate(bbox, true)
    let res = iter.next()
    while (!res.done) {
      const block = res.value
      const voxel = {
        position: block.pos,
        materialId: block.type,
      }
      yield voxel
      res = iter.next()
    }
  }

  voxelExists(x, y, z) {
    // return !!this.worldGen.getBlock(new Vector3(x, y, z))
    const h = this.worldGen.getHeight(new Vector2(x, z))
    return y < h
  }
}

/** @type {Type.Module} */
export default function () {
  const map_from = new Vector3(0, 0, 0)
  const map_to = new Vector3(256, 255, 256)
  const map_box = new Box3(map_from, map_to)

  const noise_scale = 1 / 8
  const proc_layers = ProcGenLayer.fromJsonConfig({
    procLayers: proc_layers_json.noise_panels,
  })
  const selection = ProcGenLayer.layerIndex(1)
  WorldGenerator.instance.config = {
    selection,
    samplingScale: noise_scale,
    procLayers: proc_layers,
    blockTypeMapper: block_types_mapping,
  }
  const voxel_map = new VoxelMap(map_box, WorldGenerator.instance)

  const map = {
    voxelMaterialsList: voxel_map.voxelMaterialsList,
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
      for (const voxel of voxel_map.iterateOnVoxels(block_start, block_end)) {
        const local_position = new Vector3().subVectors(
          voxel.position,
          block_start,
        )
        const cache_index = build_index(local_position)
        cache[cache_index] = 1 + voxel.materialId
        is_empty = false
      }

      return {
        data: cache,
        isEmpty: is_empty,
      }
    },
  }

  const terrain = new Terrain(map)

  return {
    tick() {
      terrain.updateUniforms()
    },
    observe({ events, signal, scene, get_state }) {
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

      // handle voxels chunks
      aiter(abortable(setInterval(1000, null, { signal }))).reduce(
        async last_chunk => {
          const state = get_state()
          const player = current_character(state)

          if (!player.position) return
          const current_chunk = to_chunk_position(player.position)
          terrain.showMapAroundPosition(
            player.position,
            state.settings.view_distance,
          )
          if (
            last_chunk &&
            (last_chunk?.x !== current_chunk.x ||
              last_chunk?.z !== current_chunk.z)
          ) {
            // here you know that the player has moved to a new chunk
            // a chunk is a 32x32 area
          }

          return current_chunk
        },
        null,
      )

      signal.addEventListener('abort', () => {
        // reset_chunks()
      })
    },
  }
}
