import { VsNotification } from 'vuesax-alpha'

// @ts-ignore
import FluentEmojiHighContrastFly from '~icons/fluent-emoji-high-contrast/fly'

export default {
  success(content, title = 'AresRPG', icon = "<i class='bx bx-check'></i>") {
    VsNotification({
      flat: true,
      color: 'success',
      icon,
      title,
      duration: 7000,
      content,
    })
  },
  error(content, title = 'Oh no!', icon = FluentEmojiHighContrastFly) {
    VsNotification({
      flat: true,
      color: '#E57373',
      position: 'bottom-right',
      title,
      content,
      duration: 7000,
      icon,
    })
  },
  info(content, title = 'AresRPG', icon = "<i class='bx bx-info-circle'></i>") {
    VsNotification({
      flat: true,
      color: 'primary',
      icon,
      position: 'bottom-right',
      title,
      duration: 7000,
      content,
    })
  },
  warn(content, title = 'Beware!', icon = "<i class='bx bx-cog'></i>") {
    VsNotification({
      flat: true,
      color: 'warn',
      position: 'bottom-right',
      title,
      duration: 7000,
      content,
      icon,
    })
  },
}
