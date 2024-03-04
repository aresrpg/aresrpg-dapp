<i18n>
  fr:
    unique_1: Il y a
    unique_2: joueurs enregistrés
    online_1: ainsi que
    online_2: joueurs en ligne
    server: Serveur
  en:
    unique_1: There are
    unique_2: registered players
    online_1: and
    online_2: players online
    server: Server
</i18n>

<template lang="pug">
vs-card
  template(#title)
    h3.title {{  t('server') }}
  template(#img)
    img(src="../../assets/ice_dragon.gif")
  template(#text)
    .stats {{ t('unique_1') }} #[b {{ server_info.registrations ?? 0 }}] {{ t('unique_2') }}
    .stats {{ t('online_1') }} #[b {{ server_info.online ?? 0 }}] {{ t('online_2') }}
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const server_info = {};
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
