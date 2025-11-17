<template lang="pug">
.listings-container
  tabs.quantity-selector(v-if="listings.length" :tabs="listings[0].stackable ? quantity_tabs : { x1: 1 }" :spaced="true" :nobg="true" :scroll="true")
    template(#tab="{ tab }")
      .tab-name {{ tab }}
    template.testo(#content="{ data, tab }")
      .none(v-if="!filter_listings(data).length") {{ t('APP_MARKET_NO_LISTINGS') }}
      .listing(
        v-for="(listing, index) in filter_listings(data)"
        :key="listing.id"
        @click="() => select_item(listing)"
        :class="{ stripped: index % 2, selected: selected_item.id === listing.id }"
      )
        img.icon(:src="listing.image_url" alt="listing image")
        .name {{ listing.name }}
        .price
          .amount (x{{ listing.amount }})
          .sui {{ final_item_price(listing)?.toFixed?.(2) }}
          TokenBrandedSui.icon
          vs-button.btn(
            v-if="listing.seller !== current_address"
            type="gradient" color="#43A047" size="small" @click="() => start_buy_item(listing)") {{ t('APP_MARKET_BUY') }}

  /// buy dialog
  vs-dialog(v-model="buy_dialog" :loading="buy_loading")
    template(#header) {{ t('APP_MARKET_BUY_CONFIRM') }}
    i18n-t(keypath="APP_MARKET_CONFIRM_DESC")
      b.itemname {{ bought_item?.name }}
      b.price {{ final_item_price(bought_item)?.toFixed?.(2) }} Sui
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="buy_dialog = false") {{ t('APP_MARKET_CANCEL') }}
        vs-button(type="transparent" color="#2ECC71" @click="buy_item") {{ t('APP_MARKET_CONFIRM') }}
</template>

<script setup>
import { watch, ref, inject, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { BigNumber as BN } from 'bignumber.js'
import { MIST_PER_SUI } from '@mysten/sui/utils'

import { sui_buy_item, mists_to_sui } from '../../core/sui/client.js'
import { SUI_EMITTER } from '../../core/modules/sui_data.js'
import toast from '../../toast.js'
import tabs from '../../components/game-ui/tabs.vue'
import { context } from '../../core/game/game.js'

// @ts-ignore
import TokenBrandedSui from '~icons/token-branded/sui'
// @ts-ignore
import GameIconsPayMoney from '~icons/game-icons/pay-money'

const selected_item_type = inject('selected_item_type')
const selected_item = inject('selected_item')
const filtered_category = inject('filtered_category')

const buy_dialog = ref(false)
const buy_loading = ref(false)
const bought_item = ref(null)
const current_address = inject('current_address')
const sui_balance = inject('sui_balance')

const listings = ref([])
const { t } = useI18n()

function filter_listings(quantity) {
  return listings.value.filter(({ amount }) => amount === quantity)
}

const quantity_tabs = {
  x1: 1,
  x10: 10,
  x100: 100,
}

function select_item(item) {
  selected_item.value = item
}

function start_buy_item(item) {
  if (
    new BN(sui_balance.value)
      .dividedBy(MIST_PER_SUI.toString())
      .isLessThan(final_item_price(item))
  ) {
    toast.warn(t('APP_MARKET_INSUFFICIENT_FUNDS'), '', GameIconsPayMoney)
    return
  }

  buy_dialog.value = true
  bought_item.value = item
}

function final_item_price(item) {
  if (
    !item.is_aresrpg_item &&
    item.item_category !== 'character' &&
    item.item_type !== 'vaporeon'
  )
    return new BN(item.list_price).dividedBy(MIST_PER_SUI.toString())

  // Determine the royalty rate
  const royalty_rate = 1.1
  return BN.max(0.1, new BN(item.list_price).times(royalty_rate)).dividedBy(
    MIST_PER_SUI.toString()
  )
}

async function buy_item() {
  if (!bought_item.value) return
  buy_loading.value = true
  try {
    select_item(bought_item.value)
    if (await sui_buy_item(bought_item.value))
      toast.success(t('APP_MARKET_BUY_SUCCESS'), '', GameIconsPayMoney)
  } catch (error) {
    console.error(error)
  }
  buy_loading.value = false
  buy_dialog.value = false
}

function fetch_listings() {
  context.send_packet('packet/marketItemListingsRequest', {
    item_type: selected_item_type.value,
    start: 0,
    limit: 50,
  })
}

watch(
  selected_item_type,
  (type, last_type) => {
    if (type === last_type) return
    listings.value = []
    fetch_listings()
  },
  { immediate: true }
)

watch(filtered_category, () => {
  if (filtered_category.value !== listings.value[0]?.item_category) {
    listings.value = []
  }
})

function on_item_purchased({ item, character = null }) {
  const id = item?.id || character?.id
  const listing_index = listings.value.findIndex((listing) => listing.id === id)

  if (listing_index !== -1) {
    listings.value.splice(listing_index, 1)
    if (!listings.value.length) {
      selected_item.value = null
      listings.value = []
    }
  }
}

function on_item_delisted(item) {
  on_item_purchased({ item })
}

function on_listings_response(payload) {
  const items = payload.listings.map((listing) => JSON.parse(listing))
  listings.value = [
    ...listings.value.filter(({ id }) => !items.some((item) => item.id === id)),
    ...items,
  ]
  select_item(items[0])
}

function on_item_listed({ item, price }) {
  listings.value.concat({
    ...item,
    price,
  })
}

onMounted(async () => {
  context.events.on('packet/marketItemListings', on_listings_response)
  SUI_EMITTER.on('ItemPurchasedEvent', on_item_purchased)
  SUI_EMITTER.on('ItemDelistedEvent', on_item_delisted)
  SUI_EMITTER.on('ItemListedEvent', on_item_listed)
})

onUnmounted(() => {
  context.events.off('packet/marketItemListings', on_listings_response)
  SUI_EMITTER.off('ItemPurchasedEvent', on_item_purchased)
  SUI_EMITTER.off('ItemDelistedEvent', on_item_delisted)
  SUI_EMITTER.off('ItemListedEvent', on_item_listed)
})
</script>

<style lang="stylus" scoped>
.none
  display flex
  justify-content center
  align-items center
  height 100%
  font-style italic
  opacity .7
  font-size .8em

.quantity-selector
  height 100%
  .tab-name
    font-size .8em
    font-weight bold
    width 40px
    text-align center
    background rgba(#6A1B9A, .5)

.listings-container
  display flex
  flex-flow column nowrap
  margin-top 1em
  height calc(100% - 260px)
  .listing
    display grid
    grid "icon name price" auto / 50px 1fr max-content
    align-items center
    cursor pointer
    &.stripped
      background-color rgba(black, .1)

    &.selected
      background-color rgba(#9FA8DA, .2)

    img.icon
      width 40px
      height @width
      object-fit contain
      border-radius 5px
      filter drop-shadow(1px 2px 3px rgba(black, .3))

    .name
      font-size .9em

    .price
      display flex
      flex-flow row nowrap
      font-size .9em
      align-items center
      border-left 1px solid rgba(white, .3)
      padding-left .5em
      .amount
        font-size .7em
        opacity .7
        width max-content
        margin-right 5px
      .sui
        margin-left auto

    a.id
      font-size .8em
      text-decoration underline
      font-style italic
      cursor pointer
      opacity .7

.dialog-content
  display flex
  align-items center
  justify-content center
.dialog-footer
  display flex
  justify-content flex-end

b.itemname
  font-style italic
  color #9575CD

b.price
  font-style italic
  color #64B5F6
</style>
