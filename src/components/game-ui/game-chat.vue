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
        :class="{ suins: alias.includes('@') }"
        @click.right="event => on_right_click_id(event, alias)"
      ) {{ alias }}
      .name ({{ name }})
      .text {{ message }}
  .input
    vs-button.canal(type="relief" color="#ECF0F1" size="small") general
    input(
      @keydown.stop="handle_keydown"
      v-model="current_message"
      @keyup.enter="send_message"
    )
</template>

<script setup>
import { nextTick, onMounted, ref, onUnmounted, inject } from 'vue';
import ContextMenu from '@imengyu/vue3-context-menu';
import { useI18n } from 'vue-i18n';

import toast from '../../toast.js';
import { context, current_sui_character } from '../../core/game/game.js';
import {
  get_alias,
  sui_get_character_name,
  sui_console_command,
} from '../../core/sui/client.js';
import {
  decrease_loading,
  increase_loading,
} from '../../core/utils/loading.js';

const history = inject('message_history');
const msg_container = ref(null);
const auto_scroll = ref(true);
const hidden = ref(false);
const wide = ref(false);
const current_message = ref('');
const online = inject('online');
const { t } = useI18n();

const typed_message_history = inject('typed_message_history');
const history_index = ref(-1);
const saved_message = ref('');

const handle_keydown = event => {
  // Handle up arrow
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (history_index.value === -1) {
      saved_message.value = current_message.value;
    }
    if (
      typed_message_history.value.length > 0 &&
      history_index.value < typed_message_history.value.length - 1
    ) {
      history_index.value++;
      current_message.value = typed_message_history.value.at(
        -(history_index.value + 1),
      );
    }
    return;
  }

  // Handle down arrow
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (history_index.value <= 0) {
      history_index.value = -1;
      current_message.value = saved_message.value;
      return;
    }
    history_index.value--;
    current_message.value = typed_message_history.value.at(
      -(history_index.value + 1),
    );
  }
};

function add_to_history(msg) {
  typed_message_history.value = [...typed_message_history.value.slice(-9), msg];
  history_index.value = -1;
}

function on_right_click_id(event, id) {
  event.preventDefault();
  ContextMenu.showContextMenu({
    x: event.x,
    y: event.y,
    theme: 'mac dark',
    items: [
      {
        label: t('APP_GAME_CHAT_COPY_ADDRESS'),
        onClick: () => {
          navigator.clipboard.writeText(id);
          toast.success(t('APP_GAME_CHAT_COPIED'));
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

async function send_message() {
  const msg = current_message.value.trim();
  if (!msg) return;

  if (!online.value) {
    toast.error(t('APP_GAME_CHAT_NO_ONLINE'));
    return;
  }

  const id = context.get_state().selected_character_id;
  if (!id) {
    toast.error(t('APP_GAME_CHAT_NO_CHARACTER'));
    return;
  }

  add_to_history(msg);
  current_message.value = '';

  if (msg.startsWith('/')) {
    if (msg.startsWith('/teleport') || msg.startsWith('/tp')) {
      const [x, y, z] = msg.split(' ').slice(1);
      if (!x || !y || !z) toast.error('Invalid teleport command');
      else
        context.send_packet('packet/serverCommand', {
          command: 'teleport',
          args: [current_sui_character().id, x, y, z],
        });
      return;
    }

    increase_loading();
    try {
      await sui_console_command(msg);
    } catch (error) {
      console.error('Unable to send console command', error);
    } finally {
      decrease_loading();
    }
    return;
  }

  context.send_packet('packet/chatMessage', { id, address: '', message: msg });
}

function address_display(address) {
  if (address.includes('@')) {
    if (address.length > 15) return `${address.slice(-5)}..`;
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

function handle_system_message(message) {
  // @ts-ignore
  history.value.push({
    name: 'System',
    message,
    alias: 'System',
    me: false,
  });
  if (history.value.length > 100) {
    history.value.shift();
  }
  nextTick(() => {
    if (auto_scroll.value) scroll_to_bottom();
  });
}

onMounted(() => {
  context.events.on('packet/chatMessage', handle_message);
  context.events.on('SYSTEM_MESSAGE', handle_system_message);
  scroll_to_bottom();
});

onUnmounted(() => {
  context.events.off('packet/chatMessage', handle_message);
  context.events.off('SYSTEM_MESSAGE', handle_system_message);
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
