<script setup>
import { inject, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
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

const props = defineProps(['type', 'color_1', 'color_2', 'color_3']);

const color1 = props.color_1
  ? ref(props.color_1)
  : inject('create_character_color1');
const color2 = props.color_2
  ? ref(props.color_2)
  : inject('create_character_color2');
const color3 = props.color_3
  ? ref(props.color_3)
  : inject('create_character_color3');

let senshi = null;
let yajin = null;
let senshi_female = null;
let yajin_female = null;

let scene = null;
let renderer = null;
const light = new DirectionalLight(0xffffff, 2);
const ambient = new AmbientLight(0xffffff, 2);

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
  if (classe.custom_colors) {
    classe.custom_colors.set_color1(color1.value);
    classe.custom_colors.set_color2(color2.value);
    classe.custom_colors.set_color3(color3.value);
    classe.custom_colors.update(renderer);
  }
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

function set_color(classe, index, color) {
  if (classe) {
    classe.custom_colors[`set_color${index}`](color);
    if (classe.custom_colors.needsUpdate())
      classe.custom_colors.update(renderer);
  }
}

watchEffect(() => {
  if (color1.value) {
    const color = new Color(color1.value);
    set_color(senshi, 1, color);
    set_color(yajin, 1, color);
    set_color(senshi_female, 1, color);
    set_color(yajin_female, 1, color);
  }
  if (color2.value) {
    const color = new Color(color2.value);
    set_color(senshi, 2, color);
    set_color(yajin, 2, color);
    set_color(senshi_female, 2, color);
    set_color(yajin_female, 2, color);
  }
  if (color3.value) {
    const color = new Color(color3.value);
    set_color(senshi, 3, color);
    set_color(yajin, 3, color);
    set_color(senshi_female, 3, color);
    set_color(yajin_female, 3, color);
  }
});

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

  const color_1_default = new Color(0xffffff);
  const color_2_default = new Color(0xff9999);
  const color_3_default = new Color(0x111fff);

  set_color(senshi, 1, color_1_default);
  set_color(yajin, 1, color_1_default);
  set_color(senshi_female, 1, color_1_default);
  set_color(yajin_female, 1, color_1_default);
  set_color(senshi, 2, color_2_default);
  set_color(yajin, 2, color_2_default);
  set_color(senshi_female, 2, color_2_default);
  set_color(yajin_female, 2, color_2_default);
  set_color(senshi, 3, color_3_default);
  set_color(yajin, 3, color_3_default);
  set_color(senshi_female, 3, color_3_default);
  set_color(yajin_female, 3, color_3_default);

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
