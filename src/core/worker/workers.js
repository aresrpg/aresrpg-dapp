import { world_settings } from '@aresrpg/aresrpg-sdk/world'
import worker_url from '@aresrpg/aresrpg-world/worker?url'
import { WorkerPool } from '@aresrpg/aresrpg-world/workerpool'

import logger from '../../logger.js'

async function create_worker_pool(name, size = 1) {
  logger.INTERNAL(`create worker_pool of size: ${size}`)
  const pool = new WorkerPool()
  await pool.initPoolEnv(size, world_settings, worker_url, name)
  return pool
}

const [LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL] =
  await Promise.all([
    create_worker_pool('lod-worker', 4),
    create_worker_pool('chunks-worker', navigator.hardwareConcurrency),
    create_worker_pool('default-worker'),
  ])

export { LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL }
