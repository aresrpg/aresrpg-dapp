<i18n>
fr:
  disconnect: Déconnexion
  connect: Connexion
  offline_ws: Hors ligne
  online_ws: En ligne
en:
  disconnect: Disconnect
  connect: Connect
  offline_ws: Offline
  online_ws: Online
</i18n>

<template lang="pug">
vs-button.btn(
  type="transparent"
  :loading="websocket_loading"
  :color="ws_color"
  :animate-inactive="user.online"
  animation-type="vertical"
  @click="toggle_ws"
)
  i.bx(:class="{ 'bx-wifi-off': !user.online, 'bx-wifi': user.online }")
  span {{ user.online ? t('online_ws') : t('offline_ws') }}
  template(#animate)
    i.bx.bx-broadcast
    span {{ user.online ? t('disconnect') : t('connect') }}
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { context, ws_status } from '../../core/game/game.js';

const { t } = useI18n();

const websocket_loading = ref(false);

const ws_color = computed(() => {
  switch (ws_status.value) {
    case 'OPEN':
      return '#27AE60';
    case 'CONNECTING':
      return '#FFA500';
    case 'CLOSED':
      return '#FF0000';
    default:
      return '#212121';
  }
});

const online = ref(false);

function update_online(state) {
  if (state.online !== online.value) online.value = state.online;
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_online);
  update_online(context.get_state());
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_online);
});

function toggle_ws() {
  if (websocket_loading.value) return;

  websocket_loading.value = true;
  if (online) disconnect_from_server();
  else connect_to_server();
}

function connect_to_server() {
  setTimeout(() => {
    context.dispatch('action/set_online', true);
    websocket_loading.value = false;
  }, 1000);
}

function disconnect_from_server() {
  setTimeout(() => {
    context.dispatch('action/set_online', false);
    websocket_loading.value = false;
  }, 1000);
}
</script>

<style lang="stylus" scoped>
.btn
  height 45px
</style>
