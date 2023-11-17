import Redis from 'ioredis';

import { REDIS_HOST, REDIS_PORT, REDIS_PWD } from './env.js';

console.log('Connecting to redis..');

const client = new Redis({
  host: REDIS_HOST,
  username: 'default',
  password: REDIS_PWD,
  port: REDIS_PORT,
});

export default {
  push(key, value) {
    return client.call('JSON.SET', key, '.', JSON.stringify(value));
  },
  async pull(uuid) {
    try {
      return JSON.parse(await client.call('JSON.GET', uuid));
    } catch {}
  },
  async delete(key) {
    await client.call('JSON.DEL', key);
  },
  async is_already_linked({ uuid, discord_id }) {
    const [, found_uuid] = await client.call(
      'FT.SEARCH',
      'users',
      `@discord_id:{${discord_id}}`,
      'NOCONTENT',
    );
    return found_uuid && found_uuid !== uuid;
  },
  async count() {
    const { num_docs } = await client.call('FT.INFO', 'users').then(result =>
      result.reduce((object, value, index) => {
        if (index % 2) return object;
        return {
          ...object,
          [value]: result[index + 1],
        };
      }, {}),
    );
    return +num_docs;
  },
};
