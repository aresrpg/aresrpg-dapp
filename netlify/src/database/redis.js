import { connect } from 'https://deno.land/x/redis@v0.29.0/mod.ts';

import { REDIS_HOST, REDIS_PORT } from '../env.js';

const client = await connect({ hostname: REDIS_HOST, port: REDIS_PORT });

export default {
  async push(key, value) {
    return client.sendCommand('JSON.SET', key, '.', JSON.stringify(value));
  },
  async pull(key) {
    try {
      return JSON.parse(await client.sendCommand('JSON.GET', key));
    } catch {
      return undefined;
    }
  },
  async delete(key) {
    return client.sendCommand('JSON.DEL', key);
  },
};
