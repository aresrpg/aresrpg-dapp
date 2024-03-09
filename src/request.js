import { VsNotification } from 'vuesax-alpha'

import { VITE_SERVER_URL } from './env.js'

let t

const show_error = message => {
  VsNotification({
    icon: `<i class='bx bxs-bug'></i>`,
    flat: true,
    color: 'danger',
    position: 'top-center',
    title: 'Oops!',
    content: message,
  })
}

const RECAPTCHA_PUBLIC = '6LfklcMiAAAAAG6KxHTI23ytDJz1Sow5sJvS4vab'

export default async function fetch_api(query, variables = {}) {
  if (!t) {
    const { i18n } = await import('./main.js')
    // eslint-disable-next-line prefer-destructuring
    t = i18n.global.t
  }

  // const recaptcha = await load(RECAPTCHA_PUBLIC, {
  //   autoHideBadge: true,
  // });

  // const captcha_token = await recaptcha.execute('app_fetch');
  const captcha_token = null
  return fetch(VITE_SERVER_URL, {
    credentials: 'include',
    method: 'POST',
    body: JSON.stringify({
      query,
      variables,
      captcha_token,
    }),
  })
    .then(result => result.json())
    .then(({ errors = [], data }) => {
      errors.forEach(error => {
        switch (error?.message) {
          case 'USER_NOT_FOUND':
            show_error(t('user_not_found'))
            break
          case 'DISCORD_ALREADY_LINKED':
            show_error(t('discord_already_linked'))
            break
          case 'MINECRAFT_ALREADY_LINKED':
            show_error(t('minecraft_already_linked'))
            break
          case 'DISCORD_NOT_LINKED':
            show_error(t('discord_not_linked'))
            break
          case 'ZEALY_NOT_LINKED':
            show_error(t('zealy_not_linked'))
            break
          case 'MINECRAFT_NOT_OWNED':
            show_error(t('minecraft_not_owned'))
            break
          case 'MINECRAFT_NOT_LINKED':
            show_error(t('minecraft_not_linked'))
            break
          case 'CAPTCHA_FAILED':
            show_error(t('captcha_failed'))
            break
          case 'NOT_LA':
            show_error(t('not_la'))
            break
          case 'REFRESH_TOO_SOON':
            show_error(t('refresh_too_soon'))
            break
          case 'INVALID_GRANT':
            show_error(t('user_not_found'))
            break
          case 'UNLINK_LAST_PROVIDER':
            show_error(t('unlink_last_provider'))
            break
          case 'UNAUTHORIZED':
          default:
            console.error(error)
        }
      })

      if (data) return data
    })
    .catch(error => {
      console.dir({ error })
    })
}
