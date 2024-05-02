import { ref } from 'vue'
import { VsLoadingFn } from 'vuesax-alpha/es'

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
  loading.value = Math.max(0, loading.value + 1)
  update()
}

export function decrease_loading() {
  loading.value = Math.max(0, loading.value - 1)
  update()
}
