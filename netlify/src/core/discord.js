import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
} from "../env.js"
import database from "../database.js"

const ARESRPG_DISCORD_ID = "265104803531587584"
const DISCORD_API = "https://discord.com/api/v10"
const ARESRPG_STAFF_ID = "311251749182767105"

function fetch_discord(endpoint, options) {
  return fetch(`${DISCORD_API}/${endpoint}`, options)
    .then((response) => response.json())
    .then(({ message, ...result }) => {
      if (message) throw new Error(message)
      return result
    })
}

async function get_access_token(refresh_token) {
  const { access_token, refresh_token: new_refresh_token, expires_in } =
    await fetch_discord(`/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token,
      }),
    })
  return { access_token, refresh_token: new_refresh_token, expires_in }
}

export async function fetch_user({
  access_token: unsure_access_token,
  expiration,
  refresh_token: old_refresh_token,
} = {}) {
  if (!unsure_access_token) return

  const {
    access_token,
    refresh_token,
    expires_in,
  } = expiration <= Date.now()
    ? await get_access_token(old_refresh_token)
    : { access_token: unsure_access_token, refresh_token: old_refresh_token }

  if (!access_token) {
    // Discord issues a new refresh_token on each refresh..
    // so some user had a wrong refresh_token in the database
    // no access_token means discord api errored, we need to force disconnect
    throw "INVALID_GRANT"
  }

  const { id, username, discriminator, avatar } = await fetch_discord(
    "/users/@me",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  )

  const { roles } = await fetch_discord(
    `/users/@me/guilds/${ARESRPG_DISCORD_ID}/member`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  )

  const staff = roles.includes(ARESRPG_STAFF_ID)
  return {
    id,
    username,
    discriminator,
    staff,
    avatar,
    refresh_token,
    expires_in,
  }
}

export function get_expiration(expires_in) {
  return Date.now() + expires_in * 1000 - 5000
}

export async function link({ code }, { uuid }) {
  if (!code) throw "CODE_MISSING"

  const { access_token, refresh_token, expires_in } = await fetch_discord(
    `/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: DISCORD_REDIRECT_URI,
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        scope: "identify%20guilds.members.read",
      }),
    },
  )

  const discord_user = await fetch_user({
    access_token,
    refresh_token,
    expiration: get_expiration(expires_in),
  })

  if (!discord_user?.id) throw "USER_NOT_FOUND"
  if (await database.is_already_linked({ uuid, discord_id: discord_user.id }))
    throw "ALREADY_LINKED"

  const minecraft_user = await database.pull(uuid)

  await database.push(uuid, {
    ...minecraft_user,
    discord: {
      ...discord_user,
      refresh_token: discord_user.refresh_token ?? refresh_token,
      access_token,
      expiration: get_expiration(discord_user.expires_in ?? expires_in),
      last_update: Date.now(),
    },
  })

  return true
}

export async function unlink(_, { uuid }) {
  const user = await database.pull(uuid)
  const { id } = user?.discord

  if (!id) throw "NOT_LINKED"

  await database.push(uuid, {
    ...user,
    discord: undefined,
    crew3: undefined,
  })

  return true
}
