import { VsNotification } from 'vuesax-alpha/es'
import { createVNode } from 'vue'

import toastVue from './components/misc/toast.vue'

// @ts-ignore
import GameIconsSeagull from '~icons/game-icons/seagull'
// @ts-ignore
import FluentEmojiHighContrastFly from '~icons/fluent-emoji-high-contrast/fly'

function create_notification(
  initial_status = 'loading',
  initial_text = 'Loading...',
  initial_title = '',
) {
  const vnode = createVNode(toastVue, {
    status: initial_status,
    text: initial_text,
    title: initial_title,
  })

  const notification_instance = VsNotification({
    duration: 'none',
    content: vnode,
  })

  return {
    update(status, text, title) {
      if (status != null) vnode.component.props.status = status
      if (title != null) vnode.component.props.text = text
      if (title != null) vnode.component.props.title = title
    },
    remove() {
      notification_instance.close()
    },
  }
}

export default {
  tx(content, title) {
    return create_notification('loading', content, title)
  },
  success(content, title = 'AresRPG', icon = "<i class='bx bx-check'></i>") {
    VsNotification({
      flat: true,
      color: '#2ECC71',
      icon,
      title,
      duration: 7000,
      content,
    })
  },
  error(content, title = 'Oh no!', icon = FluentEmojiHighContrastFly) {
    VsNotification({
      flat: true,
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
      flat: true,
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
      flat: true,
      color: '#F39C12',
      position: 'bottom-right',
      title,
      duration: 7000,
      content,
      icon,
    })
  },
  dark(content, title = '42', icon = GameIconsSeagull) {
    VsNotification({
      flat: true,
      color: '#eee',
      position: 'bottom-right',
      title,
      duration: 7000,
      content,
      icon,
    })
  },
}
