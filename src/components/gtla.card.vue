<i18n>
  fr:
    link: J'etait la
  en:
    link: I was here
</i18n>

<script setup>
import { useI18n } from 'vue-i18n';
import { inject, computed, watchEffect } from 'vue';
import card from './card.vue';
import fetch_api from '../fetch_api.js';
import { useRouter } from 'vue-router';
import found_icon from '../assets/verified.png';
import notfound_icon from '../assets/warning.png';
import notlinked_icon from '../assets/search.png';

const { t } = useI18n();
const found_color = '#2ECC71';
const notfound_color = '#E74C3C';
const notlinked_color = '#ECF0F1';

const user = inject('user');
const resync = inject('resync');

const router = useRouter();
const linked = computed(() => user?.gtla != null);
const found = computed(() => user?.gtla);
const color = computed(() =>
  linked.value ? (found.value ? found_color : notfound_color) : notlinked_color
);

const on_click = () => {
  if (!linked.value) fetch_api('/gtla').then(() => resync.value++);
  else router.push({ name: 'gtla', params: { uuid: user.uuid } });
};
</script>

<template lang="pug">
card(
  :clickable="true"
  @click="on_click"
  :border="color"
  :background="color"
)
  template(#content)
    img.logo(:src="linked ? found ? found_icon : notfound_icon : notlinked_icon")
    .name {{ t('link') }}
</template>

<style lang="stylus" scoped>
img.logo
  border-radius 5px
  margin-left .5em
  margin-right .25em
  width 25px
  object-fit contain
  filter drop-shadow(1px 2px 1px black)
.name
  padding 0 .25em
  font-size 1em
  color #ECF0F1
  padding-right .5em

.unlinked
  padding 0 .5em 0 .25em

.sep
  color #7289da

.item
  cursor pointer
  border-radius 10px
  font-size .7em
  padding .75em 1em
  text-transform uppercase
  &:hover
    background rgba(lighten(#212121, 10%), .4)
  &.disabled
    opacity .5
    cursor default
    &:hover
      background none
</style>
