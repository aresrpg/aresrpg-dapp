<template lang="pug">
.aresrpg(v-if="webgl_available")
  Interface(v-if="game_visible")
  .canvas(ref='renderer_container')
.no_webgl(v-else) {{ t('no_webgl') }}
</template>

<script setup>
import {
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import WebGL from 'three/addons/capabilities/WebGL.js'

import { pause_game, run_game, set_canvas } from '../core/game/game.js'

import Interface from './game-ui/game-interface.vue'

const renderer_container = ref(null)

const sidebar_reduced = inject('sidebar_reduced')
const game_visible = inject('game_visible')
const show_topbar = inject('show_topbar')

const webgl_available = ref(true)

onMounted(() => {
  // @ts-ignore
  if (!WebGL.isWebGL2Available()) webgl_available.value = false
  else {
    set_canvas(renderer_container.value)
    sidebar_reduced.value = true
    game_visible.value = true
    show_topbar.value = false
    run_game()
  }
})

onUnmounted(() => {
  sidebar_reduced.value = false
  game_visible.value = false
  show_topbar.value = true
  pause_game()
})

onActivated(() => {
  sidebar_reduced.value = true
  game_visible.value = true
  show_topbar.value = false
  run_game()
})

onDeactivated(() => {
  sidebar_reduced.value = false
  game_visible.value = false
  show_topbar.value = true
  pause_game()
})
</script>

<style lang="stylus" scoped>
.aresrpg
  position absolute
  bottom 0
  right 0
  width 100vw
  height 100vh
</style>
