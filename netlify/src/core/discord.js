import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
} from '../env.js';
import database from '../database.js';

const ARESRPG_DISCORD_ID = '265104803531587584';
const DISCORD_API = 'https://discord.com/api';
const ARESRPG_STAFF_ID = '311251749182767105';

function fetch_discord(endpoint, options) {
  return fetch(`${DISCORD_API}/${endpoint}`, options).then(response =>
    response.json()
  );
}

async function get_access_token(refresh_token) {
  const { access_token } = await fetch_discord(`/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
    }),
  });
  return access_token;
}

export async function fetch_user({
  access_token: unsure_access_token,
  expiration,
  refresh_token,
} = {}) {
  if (!unsure_access_token) return;

  const access_token =
    expiration <= Date.now()
      ? await get_access_token(refresh_token)
      : unsure_access_token;

  const { id, username, discriminator, avatar } = await fetch_discord(
    '/users/@me',
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  const { roles } = await fetch_discord(
    `/users/@me/guilds/${ARESRPG_DISCORD_ID}/member`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  const staff = roles.includes(ARESRPG_STAFF_ID);
  return { id, username, discriminator, staff, avatar };
}

export async function link({ code }, { uuid }) {
  if (!code) throw 'CODE_MISSING';

  const { access_token, refresh_token, expires_in } = await fetch_discord(
    `/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: DISCORD_REDIRECT_URI,
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        scope: 'identify%20guilds.members.read',
      }),
    }
  );

  const expiration = Date.now() + expires_in * 1000 - 5000;
  const { id } =
    (await fetch_user({ access_token, refresh_token, expiration })) ?? {};

  if (!id) throw 'USER_NOT_FOUND';

  // when an user link a discord account
  // we save the discord id in the user object
  // but we also push a raw uuid for the discord id key
  // as we use reJson there is no (simple) way to use additional search index
  // to be able to check if a discord id is already linked to another microsoft account
  const discord_key = `discord:${id}`;
  const minecraft_user = await database.pull(uuid);

  const uuid_linked_to_discord_id = await database.pull(discord_key);
  if (uuid_linked_to_discord_id) throw 'ALREADY_LINKED';

  await database.push(discord_key, uuid);
  await database.push(uuid, {
    ...minecraft_user,
    discord: {
      id,
      refresh_token,
      access_token,
      expiration,
    },
  });

  return true;
}

export async function unlink(_, { uuid }) {
  const user = await database.pull(uuid);
  const { id } = user?.discord;

  if (!id) throw 'NOT_LINKED';

  await database.delete(`discord:${id}`);
  await database.push(uuid, {
    ...user,
    discord: undefined,
  });

  return true;
}
