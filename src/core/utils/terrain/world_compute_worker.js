import { WorldEnv, taskWorkerSetup } from '@aresrpg/aresrpg-world'

import { world_shared_setup } from './world_setup.js'
// init worker code
taskWorkerSetup()
// configure worker's own world environment
world_shared_setup(WorldEnv.current)
WorldEnv.current.apply()
