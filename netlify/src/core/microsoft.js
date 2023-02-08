import database from "../database.js"
import {
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_REDIRECT_URI,
} from "../env.js"

const Auth = {
  microsoft: (auth_code) =>
    fetch("https://login.live.com/oauth20_token.srf", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body:
        `client_id=${MICROSOFT_CLIENT_ID}&client_secret=${MICROSOFT_CLIENT_SECRET}&code=${auth_code}&grant_type=authorization_code&redirect_uri=${MICROSOFT_REDIRECT_URI}`,
    })
      .then((response) => response.json())
      .then(({ access_token }) => access_token),

  xbox_live: (access_token) =>
    fetch(`https://user.auth.xboxlive.com/user/authenticate`, {
      method: "POST",
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${access_token}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
      .then((response) => response.json())
      .then(({ Token }) => Token),

  xtsts: (xbl_token) =>
    fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
      method: "POST",
      body: JSON.stringify({
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [xbl_token],
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT",
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
      .then((response) => response.json())
      .then(({ Token, DisplayClaims: { xui } }) => {
        const [{ uhs }] = xui
        return {
          xsts_token: Token,
          user_hash: uhs,
        }
      }),

  minecraft: ({ xsts_token, user_hash }) =>
    fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${user_hash};${xsts_token}`,
      }),
    })
      .then((response) => response.json())
      .then(({ access_token }) =>
        fetch("https://api.minecraftservices.com/minecraft/profile", {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
      )
      .then((response) => response.json())
      .then(({ id, name }) => ({ uuid: id, username: name })),
}

const hyphenize_uuid = (uuid) =>
  `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${
    uuid.substring(
      12,
      16,
    )
  }-${uuid.substring(16, 20)}-${uuid.substring(20)}`

export default async ({ code }, { Token }) => {
  if (!code) throw "CODE_MISSING"

  const { uuid, username } = await Auth.microsoft(code)
    .then(Auth.xbox_live)
    .then(Auth.xtsts)
    .then(Auth.minecraft)

  if (!uuid) throw "NOT_FOUND"

  const normalized_uuid = hyphenize_uuid(uuid.toLowerCase())
  const user = await database.pull(normalized_uuid)

  await database.push(normalized_uuid, {
    ...user,
    username,
  })

  await Token.set({ uuid: normalized_uuid })
  return true
}
