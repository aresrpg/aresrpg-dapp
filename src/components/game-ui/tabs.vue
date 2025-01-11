<script setup>
// chat-gpt generated code
import { ref, onMounted, nextTick } from 'vue';
const props = defineProps(['tabs', 'nobg', 'scroll', 'noborder']);
const active_tab = ref(Object.keys(props.tabs)[0]);
const border_style = ref({});

const tabs_container_ref = ref(null);

const update_border_style = tab_element => {
  border_style.value = {
    width: `${tab_element.offsetWidth}px`,
    transform: `translateX(${tab_element.offsetLeft}px)`,
  };
};

const set_active_tab = (tab, event) => {
  active_tab.value = tab;
  update_border_style(event.currentTarget);
};

onMounted(async () => {
  // Wait for the next DOM update cycle to ensure all elements are rendered
  await nextTick();
  const active_tab_element =
    // @ts-ignore
    tabs_container_ref.value.querySelector('.tab.active');
  if (active_tab_element) {
    update_border_style(active_tab_element);
  }
});
</script>

<template lang="pug">
.tabs
  .tabs-container(ref="tabs_container_ref")
    slot(name="before-tabs")
    .tab(
      v-for="(tab, name) in props.tabs" :key="name"
      :class="{ active: active_tab === name }"
      @click="event => set_active_tab(name, event)"
    )
      slot(:tab="name" :active="active_tab === name" name="tab" @click.stop.prevent) {{ name }}
    .animated-border(v-if="!props.noborder" :style="border_style")
  .tab-content(:class="{ 'no-bg': props.nobg, 'scroll': !!props.scroll }")
    slot(name="content" :data="props.tabs[active_tab]" :tab="active_tab")
      | Content for {{ active_tab }}
</template>

<style lang="stylus" scoped>
.tabs
  position: relative
  .tabs-container
    display: flex
    margin-bottom: -1px // Overlap the tabs with the border
    position: relative
    align-items: center
    .tab
      opacity: .5
      cursor: pointer
      user-select: none
      position: relative
      z-index: 1 // Ensure tabs are above the border
      transition: color 0.3s ease
      &.active
        opacity: 1
  .animated-border
    height: 1px
    background-color #eee
    position: absolute
    bottom: 0
    transition: all 0.3s ease

  .tab-content
    padding: .25em
    padding-top: 1em
    background #313131cf //lighten(#212121, 7%)
    border-radius 6px
    height 100%
    &.no-bg
      background transparent
    &.scroll
      // height 100%
      overflow hidden
      overflow-y auto
</style>
