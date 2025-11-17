<template lang="pug">
.zone__container
  .zone Plaine des Caffres
  .position 🗺️ {{ position?.x }}, {{ position?.y }}, {{ position?.z }} ( {{ chunk_position.x }}, {{ chunk_position.z }} )
  .players {{ t('APP_ZONE_PLAYERS') }} {{ server_info.online_players }} / {{ server_info.max_players }}
  .version Version {{ pkg.version }}
  .biome Biome #[b(:style="{ backgroundColor: biome_colors[biome] }") {{ t(`BIOME_${biome?.toUpperCase()}`) }}]
  .chunks-loading(v-if="chunks_generating > 0")
    .status-text(:style="{ color: progress_color }") {{ t('APP_ZONE_CHUNKS_LOADING') }} ({{ chunks_generating }})
</template>

<script setup>
import { onMounted, onUnmounted, reactive, inject, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { to_chunk_position } from '@aresrpg/aresrpg-sdk/chunk'
import { Biome } from '@aresrpg/aresrpg-world'
import { Vector3 } from 'three'

import pkg from '../../../package.json'
import { context, current_three_character } from '../../core/game/game.js'

const position = reactive({ x: 0, y: 0, z: 0 })
const server_info = inject('server_info')
const { t } = useI18n()
const chunk_position = computed(() => to_chunk_position(position))
const biome = ref(null)
const chunks_generating = ref(0)

const progress_color = computed(() => {
  if (chunks_generating.value >= 30) return '#ff4d4d' // red
  if (chunks_generating.value >= 10) return '#ffa64d' // orange
  return '#4dff88' // green
})

let last_biome_update = Date.now()

const biome_colors = {
  taiga: '#9eb4cb', // Cool blue-white for snowy forest
  arctic: '#e8f0ff', // Bright white-blue for freezing ice
  glacier: '#a5d6d9', // Cyan-tinted white for diamond ice
  grassland: '#90b77d', // Soft green for fields
  temperate: '#2d5a27', // Deep green for forest
  swamp: '#445552', // Dark murky green-gray
  scorched: '#d35400', // Burnt orange for burning wastes
  desert: '#e4c07e', // Warm sand color
  tropical: '#38b764', // Vibrant green for tropical garden
}

function update_position(state) {
  const pos = current_three_character(state)?.position
  if (pos) {
    const x = Math.round(pos.x)
    const y = Math.round(pos.y)
    const z = Math.round(pos.z)
    if (position.x !== x) position.x = x
    if (position.y !== y) position.y = y
    if (position.z !== z) position.z = z

    if (Date.now() - last_biome_update > 1000) {
      last_biome_update = Date.now()
      biome.value = context.world.biomes.getBiomeType(new Vector3(x, y, z))
    }
  }
}

function update_chunks_generating_count(amount) {
  chunks_generating.value = amount
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_position)
  context.events.on('CHUNKS_GENERATING', update_chunks_generating_count)
  update_position()
})

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_position)
  context.events.off('CHUNKS_GENERATING', update_chunks_generating_count)
})
</script>

<style lang="stylus" scoped>
.zone__container
  position absolute
  top 1em
  left 70px
  text-shadow 1px 2px 3px black
  .zone
    font-size 1.5em
    color #EEEEEE
  .position
    font-size 1em
    color #EEEEEE
  .chunks-loading
    .status-text
      font-size .8em
      transition color 0.3s ease
  .players
    margin-top .5em
    font-size .8em
    color #EEEEEE
  .version
    font-size .8em
    color #EEEEEE
  .biome
    font-size .8em
    color #EEEEEE
    b
      opacity 0.9
      padding 0.2em 0.4em
      border-radius 0.2em
      color white
      font-size 0.75em
      font-weight bold
</style>
