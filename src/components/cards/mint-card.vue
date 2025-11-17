<template lang="pug">
vs-card
  template(#title)
    span.title {{ props.mint.name }}
  template(#img)
    img(:src="props.mint.image_url")
  template(#text) {{ t('APP_MINT_CARD_VAPOREONTEXT') }}
  template.iiit(#interactions)
    .btns
      vs-button(type="shadow" v-if="!mint_keys.length")
        b {{ pretty_print_mists(props.mint.price) }}
        TokenSui(:style="{ fontSize: '.9em', color: '#90CAF9' }")
      vs-button(type="shadow").left
        span.total {{ t('APP_MINT_CARD_TOTAL') }}: {{ props.mint.minted }}/{{ props.mint.max_mint }}
      vs-button.btn(v-if="!mint_keys.length" type="gradient" color="#4CAF50" @click="claim") {{ t('APP_MINT_CARD_MINT') }}
      vs-button.btn(v-else type="gradient" color="#AB47BC" @click="claim")
        b {{ t('APP_MINT_CARD_FREE') }} #[span.amount (x{{ mint_keys.length }})]
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import toast from '../../toast.js'
import { pretty_print_mists } from '../../core/sui/client.js'
import {
  sui_mint_vaporeon,
  sui_get_vaporeon_mint_keys,
} from '../../core/sui/temp_vaporeon_mint.js'
import { SUI_EMITTER } from '../../core/modules/sui_data.js'

// @ts-ignore
import TokenSui from '~icons/token/sui'

const { t } = useI18n()
const props = defineProps(['mint'])
const allow_mint = ref(true)

const mint_keys = ref([])

async function claim() {
  const tx = toast.tx(t('APP_MINT_CARD_MINTING'), `${props.mint.name}`)
  try {
    allow_mint.value = false
    const result = await sui_mint_vaporeon(mint_keys.value.pop())
    if (result) tx.update('success', t('APP_MINT_CARD_MINTED'))
    else {
      console.error('Failed to mint')
      tx.remove()
    }
  } catch (error) {
    console.error(error)
    tx.update('error', t('APP_MINT_CARD_FAILED_TO_MINT'))
  }

  allow_mint.value = true
}

onMounted(async () => {
  mint_keys.value = await sui_get_vaporeon_mint_keys()
})
</script>

<style lang="stylus" scoped>
.title
  font-size 1.5em
  font-weight bold
  color #eee
  margin-bottom .5em
.btns
  display flex
  flex-flow row nowrap
  >*
    margin-right .5em
.free
  color crimson
.btn
  font-weight bold
  text-transform uppercase
  font-size .8em

.amount
  font-weight 100
  text-transform none
</style>
