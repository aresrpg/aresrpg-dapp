import { WorkerPool } from '@aresrpg/aresrpg-world'
import { world_settings } from '@aresrpg/aresrpg-sdk/world'

import logger from '../../logger.js'

import WorldWorker from './world_worker.js?worker'

async function create_worker_pool({ name, size = 1 }) {
  logger.INTERNAL(`create worker_pool of size: ${size}`)
  const pool = new WorkerPool()
  pool.init(size, new WorldWorker({ name }))
  pool.loadWorldEnv(world_settings.rawSettings)

  return pool
}

const [LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL] =
  await Promise.all([
    create_worker_pool({ name: 'lod-worker' }),
    create_worker_pool({
      name: 'terrain-worker',
      size: navigator.hardwareConcurrency,
    }),
    create_worker_pool({ name: 'default-worker' }),
  ])

export { LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL }
