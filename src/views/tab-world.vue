<template lang="pug">
sectionContainer(allow_offline="true")
  Suspense
    gameCanvas
</template>

<script setup>
import { useI18n } from 'vue-i18n';

import gameCanvas from '../components/game-canvas.vue';
import sectionContainer from '../components/misc/section-container.vue';

const { t } = useI18n();
</script>
