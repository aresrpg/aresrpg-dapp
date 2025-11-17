import { world_settings } from '@aresrpg/aresrpg-sdk/world'
// import Worker from '@aresrpg/aresrpg-world/worker?worker'
import { WorkerPool } from '@aresrpg/aresrpg-world'

import logger from '../../logger.js'

async function create_worker_pool(name, size = 1) {
  logger.INTERNAL(`create worker_pool of size: ${size}`)
  const pool = new WorkerPool(name)
  // built-in workers (if not working use external version below)
  await pool.initPoolEnv(size, world_settings)
  // external workers (if builtin are failing)
  // const worker_opt = { name: name + '-worker' }
  // await pool.initPoolEnv(
  //   size,
  //   world_settings,
  //   () => new Worker(worker_opt),
  // )
  return pool
}

const [LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL] =
  await Promise.all([
    create_worker_pool('lod'),
    create_worker_pool(
      'chunks',
      Math.min(navigator.hardwareConcurrency, 4) // limit workers to avoid eating CPU resources, and timeout bug
    ),
    create_worker_pool('default'),
  ])

export { LOD_WORKER_POOL, TERRAIN_WORKER_POOL, DEFAULT_WORKER_POOL }
