<template lang="pug">
.nothing
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import { enoki_wallet, enoki_address, enoki_login } from '../core/sui/enoki.js'
import { context } from '../core/game/game.js'
import { decrease_loading, increase_loading } from '../core/utils/loading.js'

const router = useRouter()

onMounted(async () => {
  const refresh = setTimeout(() => {
    window.location.reload()
  }, 10000)
  try {
    increase_loading()
    await enoki_login()
    const address = enoki_address()
    const wallet = enoki_wallet()
    // @ts-ignore
    context.dispatch('action/register_wallet', wallet)
    context.dispatch('action/select_wallet', 'Enoki')
    context.dispatch('action/select_address', address)
    nextTick(() => {
      router.push({ name: 'characters' })
    })
    decrease_loading()
  } catch (error) {
    console.error('Unable to verify enoki', error)
    nextTick(() => {
      window.location.reload()
    })
  } finally {
    clearTimeout(refresh)
  }
})
</script>

<style lang="stylus" scoped>
.nothing
  width 100vw
  height 100vh
</style>
