import { get_terrain_height } from '../terrain/chunk_utils.js'

export function get_fight_position(fight) {
  const position = {
    x: (fight.top_left.x + fight.bottom_right.x) / 2,
    z: (fight.top_left.z + fight.bottom_right.z) / 2,
  }
  return {
    ...position,
    y: get_terrain_height(position, 1),
  }
}
