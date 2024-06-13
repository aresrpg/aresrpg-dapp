<i18n>
en:
  copy_address: Copy address
  copied: Address copied to clipboard
  no_character: You must select a character first
  no_online: You must be online to send a message
fr:
  copy_address: Copier l'adresse
  copied: Adresse copiée
  no_character: Vous devez d'abord sélectionner un personnage
  no_online: Vous devez être en ligne pour envoyer un message
</i18n>

<template lang="pug">
.chat_container(:class="{ hidden, wide }")
  i.bx.bx-low-vision(@click="hidden = !hidden")
  i.bx.bxs-chevrons-up(v-if="!wide" @click="() => set_wide(true)")
  i.bx.bxs-chevrons-down(v-else @click="() => set_wide(false)")
  .history(
    ref="msg_container"
    @click.right="on_right_click"
    @scroll="on_scroll"
  )
    .message(v-if="!hidden" v-for="({name, message, alias, me}) in history" :key="message" :class="{ me }")
      .alias(
        :class="{ suins: alias.includes('.sui') }"
        @click.right="event => on_right_click_id(event, alias)"
      ) {{ alias }}
      .name ({{ name }})
      .text {{ message }}
  .input
    vs-button.canal(type="relief" color="#ECF0F1" size="small") general
    input(@keydown.stop="" v-model="current_message" @keyup.enter="send_message")
</template>

<script setup>
import { nextTick, onMounted, ref, onUnmounted, inject } from 'vue';
import ContextMenu from '@imengyu/vue3-context-menu';
import { useI18n } from 'vue-i18n';

import toast from '../../toast.js';
import { context } from '../../core/game/game.js';
import { get_alias, sui_get_character_name } from '../../core/sui/client.js';

const history = inject('message_history');
const msg_container = ref(null);
const auto_scroll = ref(true);
const hidden = ref(false);
const wide = ref(false);
const current_message = ref('');
const online = inject('online');
const { t } = useI18n();

function on_right_click_id(event, id) {
  event.preventDefault();
  ContextMenu.showContextMenu({
    x: event.x,
    y: event.y,
    theme: 'mac dark',
    items: [
      {
        label: t('copy_address'),
        onClick: () => {
          navigator.clipboard.writeText(id);
          toast.success(t('copied'));
        },
      },
    ],
  });
}

function set_wide(value) {
  wide.value = value;
  if (!value) {
    setTimeout(() => {
      scroll_to_bottom();
    }, 300);
  }
}

function send_message() {
  const msg = current_message.value.trim();
  if (!msg) return;

  if (!online.value) {
    toast.error(t('no_online'));
    return;
  }

  const id = context.get_state().selected_character_id;

  if (!id) {
    toast.error(t('no_character'));
    return;
  }

  context.send_packet('packet/chatMessage', {
    id,
    address: '',
    message: msg,
  });
  current_message.value = '';
}

function address_display(address) {
  if (address.includes('.sui')) {
    if (address.length > 15) return `${address.slice(-5)}..sui`;
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-2)}`;
}

function on_scroll() {
  const container = msg_container.value;
  if (
    // @ts-ignore
    container.scrollTop + container.clientHeight + 10 <
    // @ts-ignore
    container.scrollHeight
  ) {
    auto_scroll.value = false;
  } else {
    auto_scroll.value = true;
  }
}

function scroll_to_bottom() {
  // @ts-ignore
  msg_container.value.scrollTop = msg_container.value.scrollHeight;
}

async function handle_message({ id, message, address }) {
  try {
    const alias = await get_alias(address);
    const name = await sui_get_character_name(id);
    // @ts-ignore
    history.value.push({
      name,
      message,
      alias: address_display(alias),
      me: address === context.get_state().sui.selected_address,
    });
    if (history.value.length > 100) {
      history.value.shift();
    }
    nextTick(() => {
      if (auto_scroll.value) scroll_to_bottom();
    });
  } catch (error) {
    console.error('Unable to send message', error);
  }
}

onMounted(() => {
  context.events.on('packet/chatMessage', handle_message);
  scroll_to_bottom();
});

onUnmounted(() => {
  context.events.off('packet/chatMessage', handle_message);
});
</script>

<style lang="stylus" scoped>
i
  &.bx-low-vision
    position absolute
    top 1.6em
    right .5em
    cursor pointer
  &.bxs-chevrons-up
    position absolute
    top .5em
    right .5em
    cursor pointer
  &.bxs-chevrons-down
    position absolute
    top .5em
    right .5em
    cursor pointer

.chat_container
  position relative
  display flex
  flex-flow column
  background rgba(#212121, .6)
  border-radius 12px
  max-width 700px
  width 100%
  min-width 300px
  min-height 150px
  max-height 150px
  transition all .3s
  border 1px solid black
  justify-self end

  &.hidden
    opacity .3
  &.wide
    min-height 500px
    max-height 150px

  .history
    padding .5em
    flex 1
    overflow-y auto

    .message
      display flex
      flex-flow row nowrap
      font-size .7em
      &.me
        background rgba(#eee, .1)
        .alias
          color white
          &.suins
            color #eee
      .alias
        color #ECF0F1
        font-weight bold
        user-select none
        cursor pointer
        opacity .8
        &.suins
          color #3498DB
          opacity 1
      .name
        color #95A5A6
        padding-left .25em
        user-select none
        font-style italic
      .text
        color white
        padding-left .5em
  .input
    display flex
    flex-flow row nowrap
    border-top 1px solid rgba(#eee, .2)
    height 30px
    .canal
      color #212121
      font-size .7em
      font-weight bold
    input
      border none
      background none
      overflow hidden
      width 100%
      padding .5em 1em .5em .25em
      font-size .8em
</style>
