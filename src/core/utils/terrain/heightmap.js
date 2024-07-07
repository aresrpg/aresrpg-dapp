import { WorldGenerator } from '@aresrpg/aresrpg-world'
import { Vector2 } from 'three'

export function get_terrain_height({ x, z }, entity_height) {
  const ground_pos = new Vector2(Math.floor(x), Math.floor(z))
  const raw_height = WorldGenerator.instance.getRawHeight(ground_pos)
  return Math.ceil(raw_height) + entity_height * 0.5
}
