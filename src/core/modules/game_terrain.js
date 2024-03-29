import { on } from 'events'
import { setInterval } from 'timers/promises'

import { to_chunk_position } from '@aresrpg/aresrpg-protocol'
import { aiter } from 'iterator-helper'
import {
  Box3,
  Vector3,
} from 'three'
import { Terrain } from '@aresrpg/aresrpg-engine/dist/exports.js'
import {
  ProcGenLayer,
  VoxelMap,
  VoxelType,
  WorldGenerator,
} from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import { current_character } from '../game/game.js'
import proc_layers_json from '../../assets/terrain/proc_gen.json'

/** @type {Type.Module} */
export default function () {
  const voxel_types_mapping = height => {
    if (height < 75) return VoxelType.WATER
    else if (height < 80) return VoxelType.SAND
    else if (height < 125) return VoxelType.GRASS
    else if (height < 175) return VoxelType.ROCK
    return VoxelType.SNOW
  }

  const map_from = new Vector3(0, 0, 0)
  const map_to = new Vector3(256, 255, 256)
  const map_box = new Box3(map_from, map_to)

  const noise_scale = 1 / 8
  const proc_layers = ProcGenLayer.fromJsonConfig({
    procLayers: proc_layers_json.noise_panels,
  })
  const world_generator = new WorldGenerator(noise_scale, proc_layers)
  const selection = 'layer#1'
  world_generator.config = { selection }
  world_generator.voxelTypeMapper = voxel_types_mapping
  const map = new VoxelMap(map_box, world_generator)

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
          terrain.showMapAroundPosition(player.position, 50);
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
