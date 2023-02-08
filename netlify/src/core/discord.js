import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
} from "../env.js"
import database from "../database.js"

const ARESRPG_DISCORD_ID = "265104803531587584"
const DISCORD_API = "https://discord.com/api"
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
  const { access_token } = await fetch_discord(`/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
    }),
  })
  return access_token
}

export async function fetch_user({
  access_token: unsure_access_token,
  expiration,
  refresh_token,
} = {}) {
  if (!unsure_access_token) return

  const access_token = expiration <= Date.now()
    ? await get_access_token(refresh_token)
    : unsure_access_token

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
  return { id, username, discriminator, staff, avatar }
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

  const expiration = Date.now() + expires_in * 1000 - 5000
  const discord_user = await fetch_user({
    access_token,
    refresh_token,
    expiration,
  })

  if (!discord_user?.id) throw "USER_NOT_FOUND"
  if (await database.is_already_linked(discord_user.id)) throw "ALREADY_LINKED"

  const minecraft_user = await database.pull(uuid)

  await database.push(uuid, {
    ...minecraft_user,
    discord: {
      ...discord_user,
      refresh_token,
      access_token,
      expiration,
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
  })

  return true
}
