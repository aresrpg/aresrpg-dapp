import { on } from 'events'
import { setInterval } from 'timers/promises'

import { to_chunk_position } from '@aresrpg/aresrpg-protocol'
import { aiter } from 'iterator-helper'
import { Box3, Color, Vector2, Vector3 } from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine/dist/exports.js'
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
  [BlockType.ROCK]: 0xababab,
  [BlockType.GRASS]: 0x00b920,
  [BlockType.SNOW]: 0xe5e5e5,
  [BlockType.WATER]: 0x0055e2,
  [BlockType.SAND]: 0xdcbe28,
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
  const map = new VoxelMap(map_box, WorldGenerator.instance)
  const terrain = new Terrain(map)

  return {
    tick() {
      terrain.updateUniforms()
    },
    observe({ events, signal, scene, get_state }) {
      window.dispatchEvent(new Event('assets_loading'))
      events.emit('CHUNKS_LOADED')

      scene.add(terrain.container)

      events.on('CLEAR_CHUNKS', () => {
        // reset_chunks(true)
      })

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
          const player = current_character()

          if (!player.position) return
          const current_chunk = to_chunk_position(player.position)
          terrain.showMapAroundPosition(player.position, 50)
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
