import { get_nearest_floor_pos } from '../terrain/world_utils.js'

export async function get_fight_position(fight) {
  const position = {
    x: (fight.top_left.x + fight.bottom_right.x) / 2,
    z: (fight.top_left.z + fight.bottom_right.z) / 2,
  }
  return {
    ...position,
    y: get_nearest_floor_pos(position, 1),
  }
}
