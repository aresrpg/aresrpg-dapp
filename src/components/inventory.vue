<script setup>
import { inject, computed } from 'vue';
import corbac from '../assets/corbac.png';
import siluri from '../assets/siluri.png';
import krinan from '../assets/krinan.png';

const REGISTRY = {
  ['Familier Krinan Le Fourvoyeur']: {
    name: 'Krinan',
    src: krinan,
    type: 'Familier',
  },
  ['Familier Siluri']: {
    name: 'Siluri',
    src: siluri,
    type: 'Familier',
  },
  ['Familier Corbac 🦤']: {
    name: 'Corbac',
    src: corbac,
    type: 'Familier',
  },
};

const user = inject('user');
const inventory = computed(() => {
  if (user?.crew3?.id) {
    const {
      crew3: { quests },
    } = user;
    return quests
      .flat()
      .filter(({ type }) => type === 'other')
      .map(({ value }) => value.trim())
      .map(name => ({
        ...REGISTRY[name],
        amount: 1,
      }))
      .filter(value => !!value)
      .reduce((result, item) => {
        const existing = result.find(
          processed_item => processed_item.name === item.name
        );
        if (existing) existing.amount++;
        else result.push(item);
        return result;
      }, []);
  }
  return [];
});
</script>

<template lang="pug">
.container
  .content(:class="{ empty: !inventory.length }")
    .empty(v-if="!inventory.length") Start doing quests to collect items..
    .items(v-else)
      .item(v-for="item of inventory" :key="item.name" :style="{ background: `url(${item.src}) center / cover` }")
        .info
          .name {{ item.name }}
          .quantity x {{ item.amount ?? 1 }}
          .tag {{ item.type }}
</template>

<style lang="stylus" scoped>
.container
  display flex
  flex-flow column nowrap
  width 100%
  margin-left 2em
  border 1px solid #ECF0F1
  border-radius 12px
  overflow hidden
  position relative
  box-shadow 1px 2px 3px black
  color #ECF0F1
  .content
    display flex
    width 100%
    height 100%
    color #eee
    flex-flow column nowrap
    &.empty
      justify-content center
      align-items center
    .items
      padding .25em
      display flex
      flex-flow row wrap
      justify-content start
      .item
        position relative
        overflow hidden
        border-radius 12px
        width 200px
        height @width
        margin .25em
        border 1px solid black
        .info
          display flex
          flex-flow column nowrap
          position absolute
          bottom 0
          left 0
          right 0
          margin .25em
          border-radius 10px
          background rgba(black, .5)
          backdrop-filter blur(5px)
          padding .5em 1em
          .name
            text-transform uppercase
            font-size .9em
            font-weight 900
            text-shadow 1px 2px 3px #212121
          .quantity
            position absolute
            font-size .9em
            top 50%
            transform translateY(-50%)
            right 10px
          .tag
            width max-content
            color #BDC3C7
            font-size .7em
            font-family 'Itim', cursive
</style>
