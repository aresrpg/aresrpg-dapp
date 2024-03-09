<i18n>
  en:
    no_webgl: It seems WebGL is not available in your browser, please use a descent one 😀
  fr:
    no_webgl: Il semble que WebGL ne soit pas disponible dans votre navigateur, veuillez en utiliser
</i18n>

<template lang="pug">
sectionContainer(allow_offline="true")
  .editor(v-if="webgl_available")
    .canvas(ref='renderer_container')
  .no_webgl(v-else) {{ t('no_webgl') }}
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { useI18n } from 'vue-i18n';

import sectionContainer from '../components/misc/section-container.vue';
import { create_terrain_editor } from '../core/terrain-editor/terrain_editor';

const webgl_available = ref(true);
const renderer_container = ref(null);
const terrain_editor = ref(null);

const { t } = useI18n();

const loading = inject('loading');
const sidebar_reduced = inject('sidebar_reduced');

onMounted(async () => {
  if (WebGL.isWebGLAvailable()) {
    loading.value++;
    terrain_editor.value = create_terrain_editor(renderer_container.value);
    sidebar_reduced.value = true;
    loading.value--;
  } else webgl_available.value = false;
});

onUnmounted(() => {
  // cleanup the terrain editor (threejs stuff)
  terrain_editor.value?.dispose();
  sidebar_reduced.value = false;
});
</script>

<style lang="stylus" scoped>
.editor
  position absolute
  bottom 0
  right 0
  width 100vw
  height 100vh
</style>
