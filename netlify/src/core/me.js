import database from '../database.js';

import { fetch_user } from './discord.js';
import Crew3 from './crew3.js';

const HOUR_1 = 1000 * 60 * 60;

export default async (_, { uuid }) => {
  const {
    username: minecraft_username = '',
    discord: {
      id,
      username,
      discriminator,
      staff,
      avatar,
      last_update = 0,
      access_token,
      expiration,
      refresh_token,
    } = {},
    crew3: { id: crew3_id, level, rank } = {},
  } = (await database.pull(uuid)) ?? {};
  const is_discord_user_expired = last_update + HOUR_1 < Date.now();

  if (refresh_token) {
    const discord = is_discord_user_expired
      ? await fetch_user({ access_token, refresh_token, expiration })
      : { id, username, discriminator, staff, avatar };

    const crew3 =
      is_discord_user_expired || !crew3_id
        ? await Crew3.get_user(discord.id)
        : { level, rank, id: crew3_id };

    const user = {
      username: minecraft_username,
      uuid,
      discord,
      crew3: {
        ...crew3,
        ...(crew3?.id && { quests: await Crew3.get_quests(crew3.id) }),
      },
    };
    // if user was updated, save it
    if (is_discord_user_expired) {
      await database.push(uuid, {
        ...user,
        discord: {
          ...user.discord,
          last_update: Date.now(),
          access_token,
          expiration,
          refresh_token,
        },
      });
    }

    return user;
  }
  return { username: minecraft_username, uuid };
};
