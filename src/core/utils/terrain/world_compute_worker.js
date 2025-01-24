import { WorldEnv, Heightmap, WorkerSideInit } from '@aresrpg/aresrpg-world'

import { world_shared_setup } from './world_setup.js'
WorkerSideInit()
// setup worker's own environment
world_shared_setup(WorldEnv.current, Heightmap.instance)
