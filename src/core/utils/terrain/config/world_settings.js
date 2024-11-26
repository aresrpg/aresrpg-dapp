import { WorldConf } from '@aresrpg/aresrpg-world'

import world_worker_url from '../world_compute_worker.js?url&worker'

// World static config override
export const CAVES_VIEW_DIST = WorldConf.instance.patchSize * 2
// TODO: remove hardcoding and retrieve dynamic value from world
export const SEA_LEVEL = 76

// BOARDS
WorldConf.instance.boardSettings.boardRadius = 30
WorldConf.instance.boardSettings.boardThickness = 4

// WORKER POOL
WorldConf.instance.workerPool.url = world_worker_url
WorldConf.instance.workerPool.count = 4
WorldConf.instance.workerPool.type = import.meta.env.PROD ? undefined : 'module'
