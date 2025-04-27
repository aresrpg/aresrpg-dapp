import { world_settings as world_settings_sdk } from '@aresrpg/aresrpg-sdk/world'
import {
  BlocksDataFormat,
  BlocksTask,
  BlockType,
  WorldLocals,
} from '@aresrpg/aresrpg-world'
import { Vector2 } from 'three'

import { BIOMES_LANDSCAPES_CONFIG } from './configs/biome_landscapes.js'
import { getWorldDemoEnv } from './configs/world_demo_setup.js'
// import {BIOMES_LANDSCAPES_CONFIG} from '../../../../../aresrpg-world/test/configs/biome_landscapes.js'
// import { getWorldDemoEnv } from '../../../../../aresrpg-world/test/configs/world_demo_setup.js'
export const world_settings = getWorldDemoEnv()
world_settings.rawSettings.biomes.rawConf = BIOMES_LANDSCAPES_CONFIG

// world_settings_sdk.rawSettings.biomes.rawConf
world_settings.rawSettings.items.schematics.filesIndex =
  world_settings_sdk.rawSettings.items.schematics.filesIndex

const float_to_vect2_array = input_data => {
  const output_data = []
  const input_count = input_data.length / 2
  for (let i = 0; i < input_count; i++) {
    output_data.push(new Vector2(input_data[2 * i + 0], input_data[2 * i + 1]))
  }
  return output_data
}

export const fake_lod_data = input_samples => {
  const pos_batch = float_to_vect2_array(input_samples)

  const map_pos_elevation = pos => {
    const dist = pos.length()
    const elevation = 40 * (Math.sin(dist / 64) + 1) + 80
    return elevation
  }
  const map_pos_type = pos => {
    const { x, y } = pos.round()
    const tolerance = 2
    const is_grid =
      Math.abs(x) % 128 <= tolerance || Math.abs(y) % 128 <= tolerance
    return is_grid ? BlockType.SAND : BlockType.SNOW
  }
  const block_elevations = pos_batch.map(pos => map_pos_elevation(pos))
  const elevations = new Float32Array(block_elevations)
  const block_types = pos_batch.map(pos => map_pos_type(pos))
  const types = new Int8Array(block_types)
  const output_data = { elevations, types }
  return output_data
}
