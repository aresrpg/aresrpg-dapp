<template lang="pug">
vs-card
  template(#title)
    h3.title {{  t('APP_SERVER_SERVER') }}
  template(#img)
    img(src="../../assets/ice_dragon.gif")
  template(#text v-if="online")
    .stats {{ t('APP_SERVER_ONLINE_PLAYERS') }}: #[b {{ server_info.online_players ?? 0 }}] / #[b {{ server_info.max_players ?? 0 }}]
    .stats {{ t('APP_SERVER_TOTAL_PLAYERS') }}: #[b Soon™]
  template(#text v-else)
    .stats {{  t('APP_SERVER_NOT_ONLINE') }}
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const online = inject('online');
const server_info = inject('server_info');
</script>

<style lang="stylus" scoped>

.stats
    width 100%

b
  font-weight 900
  color #F39C12

h3.title
  text-transform uppercase
  font-size .8em
  font-weight 900
</style>
