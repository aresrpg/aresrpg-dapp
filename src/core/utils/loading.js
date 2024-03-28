import { ref } from 'vue'
import { VsLoadingFn } from 'vuesax-alpha'

export const loading = ref(0)
let loading_instance = null

function update() {
  if (loading.value === 1) {
    loading_instance?.close()
    loading_instance = VsLoadingFn({
      type: 'square',
      color: '#42A5F5',
      background: '#212121',
    })
  } else if (!loading.value) {
    loading_instance?.close()
  }
}

export function increase_loading() {
  loading.value++
  update()
}

export function decrease_loading() {
  loading.value--
  update()
}
