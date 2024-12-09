<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import {
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  WebGLRenderer,
  Clock,
  Vector3,
  AmbientLight,
  Color,
} from 'three';
import { nanoid } from 'nanoid';

import dispose from '../../core/utils/three/dispose.js';
import { ENTITIES } from '../../core/game/entities.js';

const scene_div = ref(null);
const canvas = ref(null);

const running = ref(false);

const props = defineProps(['type']);

let senshi = null;
let yajin = null;
let senshi_female = null;
let yajin_female = null;

let scene = null;
let renderer = null;
const light = new DirectionalLight(0xffffff, 2);
const ambient = new AmbientLight(0xffffff, 1);

function reset_classes() {
  senshi?.remove();
  yajin?.remove();
  senshi_female?.remove();
  yajin_female?.remove();

  senshi = null;
  yajin = null;
  senshi_female = null;
  yajin_female = null;
}

function setup_classe(classe) {
  classe.move(new Vector3(0, 1, 0));
  classe.animate('IDLE');
}

async function display_classe(type) {
  reset_classes();
  switch (type) {
    case 'SENSHI_MALE':
      if (!senshi) {
        senshi = await ENTITIES.senshi_male({
          id: nanoid(),
          scene_override: scene,
        });
        await senshi.set_hair();
        setup_classe(senshi);
      }
      break;
    case 'YAJIN_MALE':
      if (!yajin) {
        yajin = await ENTITIES.yajin_male({
          id: nanoid(),
          scene_override: scene,
        });
        await yajin.set_hair();
        setup_classe(yajin);
      }
      break;
    case 'SENSHI_FEMALE':
      if (!senshi_female) {
        senshi_female = await ENTITIES.senshi_female({
          id: nanoid(),
          scene_override: scene,
        });
        await senshi_female.set_hair();
        setup_classe(senshi_female);
      }
      break;
    case 'YAJIN_FEMALE':
      if (!yajin_female) {
        yajin_female = await ENTITIES.yajin_female({
          id: nanoid(),
          scene_override: scene,
        });
        await yajin_female.set_hair();
        setup_classe(yajin_female);
      }
      break;
    default:
      break;
  }
}

watch(
  props,
  ({ type }) =>
    display_classe(type).catch(error => {
      console.error('Failed to display classe', error);
    }),
  { immediate: true },
);

onMounted(async () => {
  const width = canvas.value?.clientWidth;
  const height = canvas.value?.clientHeight;
  const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);

  scene = new Scene();

  scene.userData.element = scene_div.value;
  scene.userData.camera = camera;
  // scene.background = new Color(0x999999);
  scene.background = null;

  renderer = new WebGLRenderer({
    canvas: canvas.value,
    // antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });

  renderer.setClearColor(0xffffff, 0);
  // renderer.setClearColor(0xffffff, 1);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setSize(width, height, false);

  scene.add(ambient);

  light.position.set(1, 1, 1);

  camera.position.set(1, 2, 2);
  camera.lookAt(new Vector3(0, 1.5, 0));

  scene.add(light);

  const clock = new Clock();

  await display_classe(props.type);

  function animate() {
    if (!running.value) return;
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    senshi?.mixer.update(delta);
    yajin?.mixer.update(delta);
    senshi_female?.mixer.update(delta);
    yajin_female?.mixer.update(delta);

    renderer.render(scene, camera);
  }

  running.value = true;
  animate();
});

onUnmounted(() => {
  running.value = false;
  if (scene) {
    scene.remove(ambient);
    scene.remove(light);

    reset_classes();
    renderer?.dispose();

    dispose(scene);
  }
});
</script>

<template lang="pug">
.container
  canvas.canvas(ref="canvas")
  .scene(ref="scene_div")
</template>

<style lang="stylus" scoped>
.container
  position relative
  display flex
  width 100%
  height 100%
  canvas
    width 100%
    height 100%
    position absolute
    top 0
    left 0
    z-index 0
</style>
../../core/utils/three/dispose.js
