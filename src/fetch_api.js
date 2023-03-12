import { useToast } from 'vue-toastification';
import { load } from 'recaptcha-v3';

import { VITE_BASE_API_PATH } from './env.js';

const toast = useToast();

let t;

const RECAPTCHA_PUBLIC = '6LfklcMiAAAAAG6KxHTI23ytDJz1Sow5sJvS4vab';

export default async (path, options = {}) => {
  if (!t) {
    const { i18n } = await import('./main.js');
    // eslint-disable-next-line prefer-destructuring
    t = i18n.global.t;
  }

  const recaptcha = await load(RECAPTCHA_PUBLIC, {
    autoHideBadge: true,
  });

  const captcha_token = await recaptcha.execute('app_fetch');

  return fetch(`${VITE_BASE_API_PATH}${path}`, {
    credentials: 'include',
    method: 'POST',
    ...options,
    body: JSON.stringify({
      ...options.body,
      captcha_token,
    }),
  })
    .then(result => result.json())
    .then(({ failure, result }) => {
      switch (failure) {
        case undefined:
          return result;
        case 'USER_NOT_FOUND':
          toast.error(t('user_not_found'));
        case 'ALREADY_LINKED':
          toast.error(t('discord_already_linked'));
        case 'MINECRAFT_NOT_OWNED':
          toast.error(t('minecraft_not_owned'));
        case 'UNAUTHORIZED':
        default:
          console.error(failure);
      }
    })
    .catch(error => {
      console.dir({ error });
    });
};
