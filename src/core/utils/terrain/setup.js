import { WorldEnv } from '@aresrpg/aresrpg-world'

import { chunk_data_encoder } from './world_utils.js'

// NB: LOD should be set to STATIC to limit over-computations and fix graphical issues
export const LOD_MODE = {
  NONE: 0,
  STATIC: 1,
  DYNAMIC: 2,
}

export const FLAGS = {
  LOD_MODE: LOD_MODE.NONE,
}

export const patch_size = { xz: 64, y: 64 }
export const altitude = { min: -1, max: 400 }

// chunks gen
WorldEnv.current.chunks.range.bottomId = Math.floor(altitude.min / patch_size.y)
WorldEnv.current.chunks.range.topId = Math.floor(altitude.max / patch_size.y)
WorldEnv.current.chunks.dataEncoder = chunk_data_encoder
