<template lang="pug">
.character(:class="{ locked: props.locked, [props.character.classe]: true, male: props.character.sex === 'male' }")
  span.name {{ props.character.name }} #[b.xp Lvl {{ experience_to_level(props.character.experience) }}]
  .perso()
    characterCanvasDisplay(:type="props.character.classe.toUpperCase() + '_' + props.character.sex.toUpperCase()" :colors="[props.character.color_1, props.character.color_2, props.character.color_3]")
  .field
    .title classe:
    .value {{ props.character.classe.toUpperCase() }}
    i.bx(:class="genrer_icon")
  .field
    .title id:
    a.value.id(:href="character_explorer_link" target="_blank") {{ props.character.id.slice(0, 24) }}...
  .actions
    vs-button(
      type="transparent"
      size="small"
      color="#EF5350"
      :disabled="delete_loading"
      @click="delete_dialog = true") {{ t('APP_USER_DELETE') }}

    /// deletion dialog
    vs-dialog(v-model="delete_dialog")
      template(#header) {{ t('APP_USER_DELETE') }}
      span {{ t('APP_USER_DELETE_DESC') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="delete_dialog = false") {{ t('APP_USER_CANCEL') }}
          vs-button(type="transparent" color="#2ECC71" @click="delete_character") {{ t('APP_USER_CONFIRM') }}
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { isValidSuiAddress } from '@mysten/sui/utils';

import characterCanvasDisplay from '../game-ui/character-canvas-display.vue';
import { experience_to_level } from '../../core/utils/game/experience.js';
import { sui_delete_character } from '../../core/sui/client.js';
import toast from '../../toast.js';
import { NETWORK } from '../../env.js';

const { t } = useI18n();
const props = defineProps(['character', 'locked']);

const genrer_icon = computed(() =>
  props.character.sex === 'male' ? 'bx-male-sign' : 'bx-female-sign',
);
const character_explorer_link = computed(
  () => `https://suiscan.xyz/${NETWORK}/object/${props.character.id}`,
);

const is_valid_sui_address = computed(() => {
  const is_alias = send_to.value.includes('@');
  return is_alias || isValidSuiAddress(send_to.value);
});

const delete_dialog = ref(false);
const delete_loading = ref(false);

const edit_dialog = ref(false);

const send_dialog = ref(false);
const send_to = ref('');
const send_loading = ref(false);

async function delete_character() {
  const { update, remove } = toast.tx(
    t('APP_USER_DELETING'),
    props.character.name,
  );
  try {
    if (has_equipment(props.character)) {
      update('error', t('APP_USER_HAS_EQUIPMENT'));
      delete_dialog.value = false;
      return;
    }
    delete_loading.value = true;
    delete_dialog.value = false;
    await sui_delete_character(props.character);
    update('success', t('APP_USER_DELETED'));
  } catch (error) {
    if (error) update('error', t('APP_USER_DELETE_FAILED'));
    else remove();
  } finally {
    delete_loading.value = false;
  }
}

function has_equipment(character) {
  return !!(
    character.weapon ||
    character.title ||
    character.amulet ||
    character.belt ||
    character.boots ||
    character.hat ||
    character.cloak ||
    character.pet ||
    character.left_ring ||
    character.right_ring ||
    character.relic_1 ||
    character.relic_2 ||
    character.relic_3 ||
    character.relic_4 ||
    character.relic_5 ||
    character.relic_6
  );
}
</script>

<style lang="stylus" scoped>
.character
  width 300px
  height max-content
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .3)
  border-radius 10px
  display flex
  flex-flow column nowrap
  padding .6em 1em 0
  justify-content center
  position relative
  overflow hidden

  &::before
    content ''
    position absolute
    top 0
    right 0
    bottom 0
    left 0
    z-index 1
    filter blur(3px) brightness(50%)
    background: #d7d7d78c;

  // &.senshi::before
  //   background url('https://assets.aresrpg.world/classe/senshi_female.jpg') center / cover,
  //   rgba(0, 0, 0, 0.8)
  // &.senshi.male::before
  //     background url('https://assets.aresrpg.world/classe/senshi_male.jpg') center / cover,
  //     rgba(0, 0, 0, 0.8)
  // &.yajin::before
  //   background url('https://assets.aresrpg.world/classe/yajin_female.jpg') center / cover,
  //   rgba(0, 0, 0, 0.8)
  // &.yajin.male::before
  //     background url('https://assets.aresrpg.world/classe/yajin_male.jpg') center / cover,
  //     rgba(0, 0, 0, 0.8)

  .perso
    height 250px
  >*
    position: relative
    z-index: 20

  &.locked
    border 1px solid #FFCA28

  .actions
    display flex
    justify-content flex-end
    font-size .8em

  span.name
    text-transform capitalize
    font-size 1.2em
    color #ddd
    padding-bottom .5em

    b.xp
      position absolute
      right -1em
      font-weight 900
      font-size .65em
      // text-transform uppercase
      opacity .8
      color #FFCA28
      background rgba(0, 0, 0, .3)
      border-radius 5px
      padding .25em .5em

  .field
    display flex
    flex-flow row nowrap
    align-items center
    .title
      font-weight bold
      font-size .65em
      text-transform uppercase
      opacity .7
    .value
      font-size .8em
      margin-left .5em
      text-transform capitalize

    i.bx
      font-size .875em
      margin-left .5em
      &.bx-male-sign
        color #26C6DA
      &.bx-female-sign
        color #EC407A
    a
      text-decoration underline
      opacity .7
      font-style italic

.dialog-content
  display flex
  align-items center
  justify-content center
.dialog-footer
  display flex
  justify-content flex-end
</style>
