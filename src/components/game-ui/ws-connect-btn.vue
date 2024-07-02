<i18n>
en:
  disconnect: Leave multiplayer
  connect: Join multiplayer
  offline_ws: You are playing solo
  online_ws: You are connected to the server
  connecting_ws: Joining server..
  login_first: You need to login before connecting to the server
  wrong_network: No {network} server available
fr:
  disconnect: Quitter le multijoueur
  connect: Rejoindre le multijoueur
  offline_ws: Vous jouez en solo
  online_ws: Vous êtes connecté au serveur
  connecting_ws: Connexion au serveur..
  login_first: Vous devez vous connecter avant de rejoindre le serveur
  wrong_network: Aucun serveur {network} disponible
</i18n>

<template lang="pug">
vs-button.btn(
  v-if="selected_character?.id && selected_character.id !== 'default'"
  :disabled="!VITE_SERVER_URL"
  :type="is_online ? 'transparent' : 'gradient'"
  :loading="is_connecting"
  :color="ws_color"
  :animate-inactive="is_online"
  animation-type="vertical"
  @click="toggle_ws"
)
  i.bx(:class="{ 'bx-wifi-off': !is_online, 'bx-wifi': is_online }")
  span.shadowed(v-if="VITE_SERVER_URL") {{ is_online ? t('online_ws') : t('offline_ws') }}
  i18n-t(v-else keypath="wrong_network" tag="span")
    template(#network) {{ NETWORK }}
  template(#animate)
    i.bx.bx-broadcast
    span {{ is_online ? t('disconnect') : t('connect') }}
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, inject, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { context, disconnect_ws, ws_status } from '../../core/game/game.js';
import toast from '../../toast.js';
import logger from '../../logger.js';
import { VITE_SERVER_URL, NETWORK } from '../../env.js';

const { t } = useI18n();

const connection_status = ref('CLOSED');
const selected_character = inject('selected_character');
const is_connecting = computed(() => connection_status.value === 'CONNECTING');
const is_online = computed(() => connection_status.value === 'ONLINE');

const current_address = inject('current_address');

const ws_color = computed(() => {
  if (is_connecting.value) return '#FFA500';
  if (is_online.value) return '#27AE60';
  return '#C0392B';
});

function update_online({ online }) {
  const status = connection_status.value;
  if (online && status !== 'ONLINE') connection_status.value = 'ONLINE';
  else if (status === 'ONLINE' && !online) connection_status.value = 'CLOSED';
}

watch(
  ws_status,
  () => {
    update_online({ online: ws_status.value });
  },
  { immediate: true },
);

onMounted(() => {
  if (
    selected_character.value &&
    selected_character.value?.id !== 'default' &&
    connection_status.value !== 'ONLINE'
  )
    connect_to_server();

  context.events.on('STATE_UPDATED', update_online);
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_online);
});

function toggle_ws() {
  const status = connection_status.value;
  if (status === 'CONNECTING') return;
  if (status === 'CLOSED') connect_to_server();
  else disconnect_from_server();
}

async function connect_to_server() {
  connection_status.value = 'CONNECTING';
  if (!current_address.value) {
    toast.warn(t('login_first'), 'Hey!', `<i class='bx bxs-cheese'></i>`);
    connection_status.value = 'CLOSED';
    return;
  }

  logger.SOCKET('Connecting to server');

  try {
    await context.connect_ws();
  } catch (error) {
    console.error('Failed to connect to server', error);
    connection_status.value = 'CLOSED';
  }
}

watch(
  selected_character,
  (selected, old_selected) => {
    const had_nothing = old_selected && old_selected.id === 'default';
    const has_selected = selected && selected.id !== 'default';

    if (has_selected && had_nothing && connection_status.value !== 'ONLINE')
      connect_to_server();
  },
  { immediate: true },
);

function disconnect_from_server() {
  connection_status.value = 'CLOSED';
  disconnect_ws();
}
</script>

<style lang="stylus" scoped>
.btn
  height 45px
</style>
