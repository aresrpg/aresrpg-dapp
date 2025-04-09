<script setup>
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
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
import { hex_to_int } from '@aresrpg/aresrpg-sdk/world';

import dispose from '../../core/utils/three/dispose.js';
import { ENTITIES } from '../../core/game/entities.js';

const scene_div = ref(null);
const canvas = ref(null);
const running = ref(false);

const props = defineProps(['type', 'colors', 'character']);

const create_character_colors = inject('create_character_colors', null);

let senshi = null;
let yajin = null;
let senshi_female = null;
let yajin_female = null;

let spawned_pet = null;

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

function despawn_pet() {
  if (spawned_pet) {
    spawned_pet.remove();
    spawned_pet = null;
  }
}

async function spawn_pet(character) {
  despawn_pet();

  if (!character?.pet) return;

  spawned_pet = await ENTITIES[character.pet.item_type]({
    name: character.pet.name,
    id: character.pet.id,
    scene_override: scene,
  });

  // @ts-ignore
  if (character.pet.shiny) spawned_pet.set_variant('shiny');

  spawned_pet.move(new Vector3(0.8, 0, -0.3));

  spawned_pet.animate('IDLE');
}

function set_color(classe, colors) {
  if (classe?.custom_colors)
    classe.set_colors(
      {
        color_1: new Color(
          typeof colors[0] === 'number' ? colors[0] : hex_to_int(colors[0]),
        ),
        color_2: new Color(
          typeof colors[1] === 'number' ? colors[1] : hex_to_int(colors[1]),
        ),
        color_3: new Color(
          typeof colors[2] === 'number' ? colors[2] : hex_to_int(colors[2]),
        ),
      },
      renderer,
    );
}

function setup_classe(classe, colors) {
  classe.move(new Vector3(0, 1, 0));
  classe.animate('IDLE');
  set_color(classe, colors);
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
        setup_classe(senshi, props.colors ?? create_character_colors.senshi);
        // @ts-ignore
        await senshi.set_equipment(props.character || {});
        set_color(senshi, props.colors ?? create_character_colors.senshi); // force with current renderer
      }
      break;
    case 'YAJIN_MALE':
      if (!yajin) {
        yajin = await ENTITIES.yajin_male({
          id: nanoid(),
          scene_override: scene,
        });
        setup_classe(yajin, props.colors ?? create_character_colors.yajin);
        // @ts-ignore
        await yajin.set_equipment(props.character || {});
        set_color(yajin, props.colors ?? create_character_colors.yajin); // force with current renderer
      }
      break;
    case 'SENSHI_FEMALE':
      if (!senshi_female) {
        senshi_female = await ENTITIES.senshi_female({
          id: nanoid(),
          scene_override: scene,
        });
        setup_classe(
          senshi_female,
          props.colors ?? create_character_colors.senshi_female,
        );
        // @ts-ignore
        await senshi_female.set_equipment(props.character || {});
        set_color(senshi_female, props.colors ?? create_character_colors);
      }
      break;
    case 'YAJIN_FEMALE':
      if (!yajin_female) {
        yajin_female = await ENTITIES.yajin_female({
          id: nanoid(),
          scene_override: scene,
        });
        setup_classe(
          yajin_female,
          props.colors ?? create_character_colors.yajin_female,
        );
        // @ts-ignore
        await yajin_female.set_equipment(props.character || {});
        set_color(
          yajin_female,
          props.colors ?? create_character_colors.yajin_female,
        ); // force with current renderer
      }
      break;
    default:
      break;
  }
  await spawn_pet(props.character);
}

if (create_character_colors)
  watch(create_character_colors, () => {
    if (!create_character_colors) return;
    set_color(senshi, create_character_colors.senshi);
    set_color(senshi_female, create_character_colors.senshi_female);
    set_color(yajin, create_character_colors.yajin);
    set_color(yajin_female, create_character_colors.yajin_female);
  });

watch(
  props,
  ({ type }) =>
    display_classe(type).catch(error => {
      console.error('Failed to display classe', error);
    }),
  // { immediate: true },
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

  // set_color(senshi, create_character_colors.senshi);
  // set_color(senshi_female, create_character_colors.senshi_female);
  // set_color(yajin, create_character_colors.yajin);
  // set_color(yajin_female, create_character_colors.yajin_female);

  function animate() {
    if (!running.value) return;
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    senshi?.mixer.update(delta);
    yajin?.mixer.update(delta);
    senshi_female?.mixer.update(delta);
    yajin_female?.mixer.update(delta);

    spawned_pet?.mixer.update(delta);

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
