import { WorldEnv, WorldWorkerInit, Heightmap } from '@aresrpg/aresrpg-world'
import workerpool from 'workerpool'

import { world_shared_setup } from './world_setup.js'
// HEIGHTMAP TUNING
Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
Heightmap.instance.heightmap.sampling.harmonicsCount = 6
Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
// setup worker's own environment
world_shared_setup(WorldEnv.current)
// unset URL to prevent other worker instances from spawning inside the worker.
WorldEnv.current.workerPool.url = ''
WorldWorkerInit(workerpool)
