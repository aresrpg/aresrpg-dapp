import { VsNotification } from 'vuesax-alpha/es'

// @ts-ignore
import FluentEmojiHighContrastFly from '~icons/fluent-emoji-high-contrast/fly'

export default {
  success(content, title = 'AresRPG', icon = "<i class='bx bx-check'></i>") {
    VsNotification({
      color: '#2ECC71',
      icon,
      title,
      duration: 7000,
      content,
    })
  },
  error(content, title = 'Oh no!', icon = FluentEmojiHighContrastFly) {
    VsNotification({
      color: '#E74C3C',
      position: 'bottom-right',
      title,
      content,
      duration: 7000,
      icon,
    })
  },
  info(content, title = 'AresRPG', icon = "<i class='bx bx-info-circle'></i>") {
    VsNotification({
      color: '#3498DB',
      icon,
      position: 'bottom-right',
      title,
      duration: 7000,
      content,
    })
  },
  warn(content, title = 'Beware!', icon = "<i class='bx bx-cog'></i>") {
    VsNotification({
      color: '#F1C40F',
      position: 'bottom-right',
      title,
      duration: 7000,
      content,
      icon,
    })
  },
}
