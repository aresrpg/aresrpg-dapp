import { VsNotification } from 'vuesax-alpha'

export default {
  success(content, title = 'AresRPG') {
    VsNotification({
      flat: true,
      color: 'success',
      title,
      content,
    })
  },
  error(content, title = 'Oh no!', icon = "<i class='bx bxs-bug'></i>") {
    VsNotification({
      flat: true,
      color: 'danger',
      position: 'bottom-right',
      title,
      content,
      duration: 7000,
      icon,
    })
  },
  info(content, title = 'AresRPG') {
    VsNotification({
      flat: true,
      color: 'primary',
      position: 'bottom-right',
      title,
      content,
    })
  },
  warn(content, title = 'Beware!', icon = "<i class='bx bx-cog'></i>") {
    VsNotification({
      flat: true,
      color: 'warn',
      position: 'bottom-right',
      title,
      content,
      icon,
    })
  },
}
