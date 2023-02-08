import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts"

import {
  COOKIE_DOMAIN,
  COOKIE_PATH,
  COOKIE_SAMESITE,
  COOKIE_SECURE,
  PRIVATE_KEY,
  PUBLIC_KEY,
} from "./env.js"

function import_key(key, scope) {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(key),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    scope,
  )
}

const private_key = await import_key(PRIVATE_KEY, ["sign"])
const public_key = await import_key(PUBLIC_KEY, ["verify"])

const ACCESS_TOKEN_COOKIE_NAME = "justeleblanc"
const A_YEAR = 60000 * 60 * 24 * 365

export default ({ get_cookies, set_cookies, del_cookies }) => ({
  get: async () => {
    try {
      return await verify(get_cookies(ACCESS_TOKEN_COOKIE_NAME), public_key)
    } catch {}
  },
  set: async (bearer) => {
    const cookie_options = {
      httpOnly: true,
      overwrite: true,
      maxAge: A_YEAR,
      ...(COOKIE_PATH && { path: COOKIE_PATH }),
      ...(COOKIE_SAMESITE && { sameSite: COOKIE_SAMESITE }),
      ...(COOKIE_SECURE && { secure: COOKIE_SECURE }),
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    }
    const access_token = await create({ alg: "ES256" }, bearer, private_key)
    set_cookies(ACCESS_TOKEN_COOKIE_NAME, access_token, cookie_options)
  },
  rm: () => {
    const cookie_options = {
      httpOnly: true,
      overwrite: true,
      expires: new Date(0),
      ...(COOKIE_PATH && { path: COOKIE_PATH }),
      ...(COOKIE_SAMESITE && { sameSite: COOKIE_SAMESITE }),
      ...(COOKIE_SECURE && { secure: COOKIE_SECURE }),
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    }

    del_cookies(ACCESS_TOKEN_COOKIE_NAME)
    // set_cookies(ACCESS_TOKEN_COOKIE_NAME, "buy bitcoin :)", cookie_options)
  },
})
