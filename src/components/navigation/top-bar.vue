<script setup>
import { ref, inject, onMounted, onUnmounted, watch } from 'vue';
import useBreakpoints from 'vue-next-breakpoints';
import { useI18n } from 'vue-i18n';
import Dropdown from 'v-dropdown';

import suiWalletSelector from '../sui-login/sui-wallet-selector.vue';
import { context, disconnect_ws } from '../../core/game/game.js';
import {
  mists_to_sui,
  sui_get_kiosks_profits,
  sui_claim_kiosks_profits,
} from '../../core/sui/client.js';
import logger from '../../logger.js';
import { enoki_login_url } from '../../core/sui/enoki.js';
import { NETWORK } from '../../env.js';
import {
  decrease_loading,
  increase_loading,
} from '../../core/utils/loading.js';
import toast from '../../toast.js';
import { SUI_EMITTER } from '../../core/modules/sui_data.js';

// @ts-ignore
import PhCopy from '~icons/ph/copy';
// @ts-ignore
import StreamlineEmojisMoneyWithWings from '~icons/streamline-emojis/money-with-wings';
// @ts-ignore
import StreamlineEmojisWaterWave from '~icons/streamline-emojis/water-wave';

const { t } = useI18n();

const update_selected_account = account => {
  context.dispatch('action/select_address', account.address);
  localStorage.setItem('last_selected_address', account.address);
};

const breakpoints = useBreakpoints({
  mobile: 1000,
});
// dialog to choose between google and Sui Wallet
const login_dialog = ref(false);
// dialog to choose the Sui Wallet
const sui_wallet_dialog = ref(false);
const dropdown = ref(null);

const available_accounts = inject('available_accounts');
const current_wallet = inject('current_wallet');
const current_address = inject('current_address');
const current_account = inject('current_account');
const sui_balance = inject('sui_balance');

const kiosk_profits = ref('');

function address_display(account) {
  if (!account) return 'not found';
  if (account.alias?.includes('@')) return account.alias;
  return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
}

function disconnect_wallet() {
  current_wallet.value.disconnect();
  disconnect_ws();
}

function copy_address() {
  navigator.clipboard.writeText(current_account.value.address);
  toast.success(t('APP_TOP_BAR_COPIED'), 'Woooosh', StreamlineEmojisWaterWave);
  dropdown.value.close();
}

async function enoki_login() {
  login_dialog.value = false;
  logger.INTERNAL(`Enoki login`);
  increase_loading();
  window.location.href = await enoki_login_url();
}

async function refresh_kiosk_profits() {
  const profits = await sui_get_kiosks_profits();
  kiosk_profits.value = (+mists_to_sui(profits)).toFixed(2);
  kiosk_profits.value = kiosk_profits.value.replace(/\.?0+$/, '');
}

async function claim_kiosk_profits() {
  const tx = toast.tx(
    t('APP_TOP_BAR_CLAIMING_PROFIT'),
    `${kiosk_profits.value} Sui`,
  );
  try {
    await sui_claim_kiosks_profits();
    tx.update('success', t('APP_TOP_BAR_PROFIT_CLAIMED'));
    kiosk_profits.value = '';
  } catch (error) {
    tx.update('error', t('APP_TOP_BAR_CLAIM_FAILED'));
    console.error(error);
  }
}

const claiming_faucet = ref(false);

async function claim_faucet() {
  const tx = toast.tx(t('APP_TOP_BAR_FAUCET_CLAIM'), 'Brrrrrr');
  claiming_faucet.value = true;

  try {
    await fetch('https://faucet.testnet.sui.io/gas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FixedAmountRequest: {
          recipient: current_account.value.address,
        },
      }),
    });

    tx.update('success', t('APP_TOP_BAR_FAUCET_CLAIMED'));
  } catch (error) {
    tx.update('error', t('APP_TOP_BAR_FAUCET_FAILED'));
    console.error(error);
  }

  setTimeout(() => {
    claiming_faucet.value = false;
  }, 1000);
}

watch(current_address, refresh_kiosk_profits);

onMounted(() => {
  refresh_kiosk_profits();
  SUI_EMITTER.on('ItemSoldEvent', refresh_kiosk_profits);
});

onUnmounted(() => {
  SUI_EMITTER.off('ItemSoldEvent', refresh_kiosk_profits);
});
</script>

<template lang="pug">
nav(:class="{ small: breakpoints.mobile.matches }")
  .beware-tesnet(v-if="NETWORK !== 'mainnet'") {{ t('APP_TOP_BAR_TESTNET') }}
  .beware-mainnet(v-if="NETWORK === 'mainnet'") {{ t('APP_TOP_BAR_MAINNET') }} #[a(href="https://testnet.aresrpg.world") https://testnet.aresrpg.world]
  vs-row(justify="end")
    // ======
    vs-button.btn(v-if="!current_wallet" type="border" color="#eee" @click="login_dialog = true")
      i.bx.bx-droplet
      span {{ t('APP_TOP_BAR_CONNECT') }}
    vs-row.row(v-else justify="end")
      .sui-balance(v-if="sui_balance != null")
        span {{ (+mists_to_sui(sui_balance)).toFixed(3) }}
        img.icon(src="../../assets/sui/sui-logo.png")
      vs-button.sui-faucet(v-if="NETWORK === 'testnet'" type="gradient" size="small" color="#64B5F6" @click="claim_faucet" :disabled="claiming_faucet")
        span.profit {{ t('APP_TOP_BAR_FAUCET') }}
      vs-button(
        v-if="kiosk_profits > 0"
        type="gradient"
        color="#76FF03"
        size="small"
        @click="claim_kiosk_profits"
      )
        span.profit {{ t('APP_TOP_BAR_SALES') }}: {{ kiosk_profits }} Sui
      .badge(:class="{ mainnet: NETWORK === 'mainnet' }") Sui {{ NETWORK }} #[img.icon(:src="current_wallet.icon")]
      // Address container with dropdown

      Dropdown(:border="false" ref="dropdown")
        template(#trigger)
          vs-button(type="transparent" color="#eee").address_container
            span.address {{ address_display(current_account) }}
            i.bx.bx-chevron-down
        .dropdown-content
          vs-row(justify="center")
            vs-button.btn(
              type="transparent"
              block color="#9E9E9E"
              v-for="account in available_accounts"
              :key="account.address"
              @click="() => (update_selected_account(account), dropdown.close())"
            ) {{ address_display(account) }}
          vs-row(justify="center")
            vs-button.btn(type="transparent" block color="#1ABC9C" @click="copy_address")
              PhCopy
              span {{ t('APP_TOP_BAR_COPY') }}
          vs-row(justify="center")
            vs-button.btn(type="transparent" block color="#E74C3C" @click="disconnect_wallet")
              i.bx.bx-log-out
              span {{ t('APP_TOP_BAR_LOGOUT') }}
      //- vs-avatar(history size="60" @click="logout_dialog = true")
        img(:src="avatar")

  // First login dialog to choose between google (ZkLogin) and Sui Wallet
  vs-dialog(v-model="login_dialog" overlay-blur)
    template(#header)
      img.logo(src="../../assets/logo.png")
    vs-row(justify="center")
      .title {{ t('APP_TOP_BAR_LOGIN') }}
    vs-button.btn(type="gradient" block color="#E74C3C" @click="enoki_login" :disabled="NETWORK === 'mainnet'")
      i.bx.bxl-google
      span Google
    vs-button.btn(type="gradient" block color="#3498DB" @click="(sui_wallet_dialog = true, login_dialog = false)")
      i.bx.bx-droplet
      span SUI Wallet
    template(#footer)
      vs-row(justify="center")
        i18n-t.alt(keypath="APP_TOP_BAR_ALT" tag="span")
          a.zklogin(href="https://sui.io/zklogin", target="_blank") ZkLogin
      vs-row(justify="center")
        span.alt {{ t('APP_TOP_BAR_ALT2') }}

  // Second dialog to select the Sui wallet

  vs-dialog(v-model="sui_wallet_dialog" overlay-blur not-padding)
    suiWalletSelector(@connection_done="sui_wallet_dialog = false")

</template>

<style lang="stylus" scoped>
.profit
  color #212121
.beware-tesnet, .beware-mainnet
  position absolute
  top 0
  left 0
  width 100%
  height 25px
  display flex
  justify-content center
  align-items center
  font-size .7em
  font-weight bold
  text-transform uppercase
  background linear-gradient(100deg, crimson, #EE5A24)
  &.beware-mainnet
    background linear-gradient(100deg, #009688, #2ECC71)
    text-transform none
    a
      color white
      text-decoration underline
      cursor pointer
      margin-left .5em
      &:hover
        text-decoration none
        color #F1C40F

.logo
  width 200px
  filter drop-shadow(1px 2px 3px black)
.icon
  width 20px
  object-fit contain
  margin-left .3em
span.alt
  font-size .8em
  .zklogin
    color #3498DB
    text-decoration underline
    cursor pointer
    &:hover
      text-decoration none

.sui-balance
  display flex
  margin-right 1em
  justify-content center
  align-items center
  height max-content
  span
    font-size .875em
    margin-right .5em
  img
    transform translateY(-2px)
    width 15px
    object-fit contain

.sui-faucet
  margin-right .25em

nav
  padding 1em
  .row
    align-items center
    .address_container
      .address
        font-size 1.2em
        text-shadow 1px 2px 3px black
      i
        font-size 1.3em
        margin-left .5em
    .badge
      display flex
      align-items center
      margin .25em
      text-transform capitalize
      box-shadow 1px 2px 3px black
      border-radius 20px
      border 1px solid #F39C12
      font-size .8em
      color #ECF0F1
      padding .25em 1em
      &.mainnet
        border 1px solid #27AE60
    .username
      cursor default
      margin-right .5em
      text-transform capitalize
      font-size 1.3em
      margin-left 1em

.not-mainnet
  width 100%
  position absolute
  top 0
  left 0
  z-index 10000
  background crimson
  display flex
  justify-content center
  align-items center
  text-transform uppercase
  font-size .6em
  padding .5em
  font-weight bold
  opacity .7

.dropdown-content
  padding .5em
  font-size .8em
  user-select none
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .5)
  max-width 200px
.btn
  margin-top .5em
</style>
