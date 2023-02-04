import database from '../database.js';

import { fetch_user } from './discord.js';

export default async (_, { uuid }) => {
  const { username = '', discord } = (await database.pull(uuid)) ?? {};

  return {
    username,
    uuid,
    discord: await fetch_user(discord),
  };
};
