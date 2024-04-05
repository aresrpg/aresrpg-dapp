<i18n>
  fr:
    total_player: Joueurs en ligne
    total_characters: Personnages en ligne
    server: Serveur
    not-online: Vous devez vous connecter au serveur pour voir les statistiques en direct
  en:
    total_player: Online players
    total_characters: Online characters
    server: Server
    not-online: You must connect to the server to see live analytics
</i18n>

<template lang="pug">
vs-card
  template(#title)
    h3.title {{  t('server') }}
  template(#img)
    img(src="../../assets/ice_dragon.gif")
  template(#text v-if="online")
    .stats {{ t('total_player') }}: #[b {{ server_info.online_players ?? 0 }}] / #[b {{ server_info.max_players ?? 0 }}]
    .stats {{ t('total_characters') }}: #[b {{ server_info.online_characters ?? 0 }}]
  template(#text v-else)
    .stats {{  t('not-online') }}
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
