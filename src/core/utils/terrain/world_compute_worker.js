import { WorldEnv, Heightmap, ProcessingTask } from '@aresrpg/aresrpg-world'
import workerpool from 'workerpool'

import { world_shared_setup } from './world_setup.js'
// setup worker's own environment
world_shared_setup(WorldEnv.current, Heightmap.instance)
// setup objects replication in worker
const { replicate } = ProcessingTask
workerpool.worker({ replicate })
