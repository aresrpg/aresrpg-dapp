<i18n>
  en:
    no_webgl: It seems WebGL is not available in your browser, please use a descent one 😀
  fr:
    no_webgl: Il semble que WebGL ne soit pas disponible dans votre navigateur, veuillez en utiliser
</i18n>

<template lang="pug">
sectionContainer
  Suspense
    gameCanvas
</template>

<script setup>
import { useI18n } from 'vue-i18n';

import gameCanvas from '../components/game-canvas.vue';
import sectionContainer from '../components/misc/section-container.vue';

const { t } = useI18n();
</script>

<style lang="stylus">
.aresrpg
  width 100vw
  height 100vh
  overflow hidden

.no_webgl
  display flex
  justify-content center
  align-items center
  height 100vh
  color #e1c79b
</style>
