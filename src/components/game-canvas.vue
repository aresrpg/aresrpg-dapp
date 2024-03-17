<template lang="pug">
.aresrpg(v-if="webgl_available")
  Interface(v-if="game_visible")
  .canvas(ref='renderer_container')
.no_webgl(v-else) {{ t('no_webgl') }}
</template>

<script setup>
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';

import {
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch,
} from 'vue';
import { useWebSocket } from '@vueuse/core';
import { create_client } from '@aresrpg/aresrpg-protocol';
import WebGL from 'three/addons/capabilities/WebGL.js';

import create_game, { FILTER_PACKET_IN_LOGS } from '../core/game/game.js';
import logger from '../logger.js';
import toast from '../toast.js';
import { VITE_SERVER_URL } from '../env.js';

import Interface from './game-ui/game-interface.vue';

const renderer_container = ref(null);
const packets = new PassThrough({ objectMode: true });
const ares_client = ref(null);

const loading = inject('loading');
const sidebar_reduced = inject('sidebar_reduced');
const show_topbar = inject('show_topbar');

const webgl_available = ref(true);
const ws_status = ref('');
const STATE = ref({});

let disconnect_reason = null;

const game_visible = ref(false);
const game_visible_emitter = new EventEmitter();

watch(game_visible, (value, previous) => {
  if (value === previous) return;
  if (value) {
    show_topbar.value = false;
    game_visible_emitter.emit('show');
  } else {
    show_topbar.value = true;
    game_visible_emitter.emit('hide');
  }
});

const game = ref(
  await create_game({
    packets,
    on_game_show: handler => {
      game_visible_emitter.on('show', handler);
    },
    on_game_hide: handler => {
      game_visible_emitter.on('hide', handler);
    },
    send_packet(type, payload) {
      if (!ares_client.value) throw new Error('Not connected to server');
      if (!FILTER_PACKET_IN_LOGS.includes(type))
        logger.NETWORK_OUT(type, payload);
      ares_client.value.send(type, payload);
    },
    connect_ws() {
      return new Promise(resolve => {
        const { status } = useWebSocket(VITE_SERVER_URL, {
          autoReconnect: {
            retries: () => !disconnect_reason,
          },

          onDisconnected(ws, event) {
            loading.value--;
            if (event.reason) {
              disconnect_reason = event.reason;
              switch (event.reason) {
                case 'ALREADY_ONLINE':
                  disconnect_reason = null;
                  toast.error(
                    'It seems you are already connected to the server, please wait a few seconds and try again',
                    'Oh no!',
                    `<i class='bx bx-key'/>`,
                  );
                  break;
                case 'EARLY_ACCESS_KEY_REQUIRED':
                  toast.error(
                    'You need an early access key to play on AresRPG',
                    'Oh no!',
                    `<i class='bx bx-key'/>`,
                  );
                  break;
                default:
                  toast.error(event.reason);
              }
            }
            ares_client.value?.notify_end(event.reason);
            logger.SOCKET(`disconnected: ${event.reason}`);
          },
          onMessage(ws, event) {
            const message = event.data;
            ares_client.value.notify_message(message);
          },
          onConnected: ws => {
            disconnect_reason = null;
            ws.binaryType = 'arraybuffer';
            logger.SOCKET(`connected to ${VITE_SERVER_URL}`);

            ares_client.value = create_client({
              socket_write: ws.send.bind(ws),
              socket_end: message => ws.close(1000, message),
            });

            ares_client.value.stream.pipe(packets);

            resolve();
          },
        });

        watch(status, value => {
          ws_status.value = value;
        });
      });
    },
  }),
);

provide('game', game);
provide('state', STATE);
provide('ws_status', ws_status);

const update_state = state => {
  STATE.value = state;
};

onMounted(() => {
  if (!WebGL.isWebGLAvailable()) webgl_available.value = false;
  else {
    game.value.start(renderer_container.value);
    game.value.events.on('STATE_UPDATED', update_state);
    sidebar_reduced.value = true;
    game_visible.value = true;
  }
});

onUnmounted(() => {
  game.value.events.off('STATE_UPDATED', update_state);
  game.value.stop();
  sidebar_reduced.value = false;
  game_visible.value = false;
});

onActivated(() => {
  sidebar_reduced.value = true;
  game_visible.value = true;
});

onDeactivated(() => {
  sidebar_reduced.value = false;
  game_visible.value = false;
});
</script>

<style lang="stylus" scoped>
.aresrpg
  position absolute
  bottom 0
  right 0
  width 100vw
  height 100vh
</style>
./game-ui/game-interface.vue/index.js
