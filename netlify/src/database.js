import { USE_PERSISTENT_STORAGE } from './env.js';
import memory_database from './database/memory.js';

async function redis_database() {
  const { default: redis } = await import('./database/redis.js');
  return redis;
}

export default USE_PERSISTENT_STORAGE
  ? await redis_database()
  : memory_database;
