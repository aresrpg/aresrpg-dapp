import { world_settings } from '@aresrpg/aresrpg-sdk/world'
// import Worker from '@aresrpg/aresrpg-world/worker?worker'
import { WorkerPool } from '@aresrpg/aresrpg-world'

import logger from '../../logger.js'

async function create_worker_pool(name, size = 1) {
  logger.INTERNAL(`create worker_pool of size: ${size}`)
  const pool = new WorkerPool()
  // built-in workers (if not working use external version below)
  await pool.initPoolEnv(size, world_settings)
  // external workers (if builtin are failing)
  // await pool.initPoolEnv(size, world_settings, () => new Worker({ name }))
  return pool
}

const [LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL] =
  await Promise.all([
    create_worker_pool('lod-worker'),
    create_worker_pool(
      'chunks-worker',
      Math.min(navigator.hardwareConcurrency, 4), // limit workers to avoid eating CPU resources, and timeout bug
    ),
    create_worker_pool('default-worker'),
  ])

export { LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL }
