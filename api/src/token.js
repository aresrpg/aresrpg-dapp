import jwt from 'jsonwebtoken';

import {
  ACCESS_TOKEN_COOKIE_NAME,
  PRIVATE_KEY,
  PUBLIC_KEY,
  ACCESS_TOKEN_EXPIRATION,
  COOKIE_SAMESITE,
  COOKIE_PATH,
  COOKIE_SECURE,
  COOKIE_DOMAIN,
} from './env.js';

export default function ({ get_cookie, set_cookie }) {
  return {
    get: ignoreExpiration => {
      try {
        return jwt.verify(get_cookie(ACCESS_TOKEN_COOKIE_NAME), PUBLIC_KEY, {
          algorithms: 'ES512',
          ignoreExpiration,
        });
      } catch {
        return {};
      }
    },
    set: bearer => {
      const options = {
        httpOnly: true,
        overwrite: true,
        maxAge: 60000 * 60 * 24 * 365,
        ...(COOKIE_PATH && { path: COOKIE_PATH }),
        ...(COOKIE_SAMESITE && { sameSite: COOKIE_SAMESITE }),
        ...(COOKIE_SECURE && { secure: COOKIE_SECURE }),
        ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
      };
      const access_token = jwt.sign(bearer, PRIVATE_KEY, {
        algorithm: 'ES512',
        expiresIn: ACCESS_TOKEN_EXPIRATION,
      });

      return set_cookie({
        name: ACCESS_TOKEN_COOKIE_NAME,
        value: access_token,
        options,
      });
    },
    rm: () =>
      set_cookie({
        name: ACCESS_TOKEN_COOKIE_NAME,
        value: 'bonjour',
        options: {
          httpOnly: true,
          overwrite: true,
          expires: new Date(0),
          ...(COOKIE_PATH && { path: COOKIE_PATH }),
          ...(COOKIE_SAMESITE && { sameSite: COOKIE_SAMESITE }),
          ...(COOKIE_SECURE && { secure: COOKIE_SECURE }),
          ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
        },
      }),
  };
}
