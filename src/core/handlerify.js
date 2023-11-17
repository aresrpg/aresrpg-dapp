import token from './token.js';
import { RECAPTCHA_SECRET } from './env.js';
import cookie from 'cookie';

async function verifyRecaptcha(token) {
  const response = await fetch(
    'https://www.google.com/recaptcha/api/siteverify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET,
        response: token,
      }),
    },
  );
  const data = await response.json();
  return data.success && data.score >= 0.5;
}

export default (handle, { secure, captcha } = {}) =>
  async (request, response) => {
    const { cookies, body: body_json } = request;
    const body = body_json ? JSON.parse(body_json) : undefined;
    if (!body) return response.status(400).json({ failure: 'MISSING BODY' });

    const { captcha_token } = body;

    if (captcha) {
      const is_human = await verifyRecaptcha(captcha_token);
      if (!is_human)
        return response.status(400).json({ failure: 'CAPTCHA FAILED' });
    }

    const Token = token({
      set_cookie: ({ name, value, options }) =>
        response.setHeader('Set-Cookie', [
          cookie.serialize(name, value, options),
        ]),
      get_cookie: name => cookies[name],
    });

    const context = {
      ...(await Token.get()),
      Token,
    };

    // if route is meant to be for logged users
    if (secure) {
      const { uuid } = context;
      if (!uuid) return response.status(400).json({ failure: 'UNAUTHORIZED' });
    }

    return handle(body, context)
      .then(result => {
        response.status(200).json({ result });
      })
      .catch(failure =>
        response.status(400).json({ failure: failure.message ?? failure }),
      );
  };
