import { WorldEnv, WorkerSideInit } from '@aresrpg/aresrpg-world'

import { apply_world_env_configuration } from './voxel_world.js'

WorkerSideInit()
apply_world_env_configuration()
WorldEnv.current.apply()
