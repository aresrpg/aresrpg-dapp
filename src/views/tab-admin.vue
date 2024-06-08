<template lang="pug">
sectionContainer
  sectionHeader(title="Admin overview" desc="Success is not given, it's taken. You have to be aggressive and go after what you want in life." color="#FF3D00")
    .character
      span Character royalties:
      .amount {{ (+mists_to_sui(admin.character_profits)).toFixed(2) }} #[TokenBrandedSui]
    .item
      span Item royalties:
      .amount {{ (+mists_to_sui(admin.item_profits)).toFixed(2) }} #[TokenBrandedSui]
    .withdraw
      vs-button(type="gradient" color="#03A9F4" @click="withdraw") Withdraw
  sectionHeader(title="Admin caps")
    .caps
      .cap.material-2(v-for="(cap, index) in admin.admin_caps" :key="index")
        a.id(@click="() => open_explorer(item.id)") {{ short_id(cap) }}
        vs-button.amount(@click="() => sui_delete_admin_cap(cap)" type="gradient" color="#D32F2F" size="small") Delete

</template>

<script setup>
import { inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import sectionHeader from '../components/misc/section-header.vue';
import sectionContainer from '../components/misc/section-container.vue';
import {
  mists_to_sui,
  sui_withdraw_policies_profit,
  sui_delete_admin_cap,
  sui_get_policies_profit,
} from '../core/sui/client.js';
import { decrease_loading, increase_loading } from '../core/utils/loading.js';
import toast from '../toast.js';
import { NETWORK } from '../env.js';

// @ts-ignore
import TokenBrandedSui from '~icons/token-branded/sui';

const router = useRouter();
const admin = inject('admin');

const short_id = id => `${id.slice(0, 5)}..${id.slice(-5)}`;

const open_explorer = id => {
  window.open(`https://suiscan.xyz/${NETWORK}/object/${id}`, '_blank');
};

async function withdraw() {
  try {
    increase_loading();
    await sui_withdraw_policies_profit();
    const { character_profits, item_profits } = await sui_get_policies_profit();

    admin.character_profits = character_profits;
    admin.item_profits = item_profits;

    toast.dark('Profits withdrawn, soon bali ?', 'GG wp!');
  } catch (error) {
    console.error(error);
  }
  decrease_loading();
}

onMounted(() => {
  if (!admin.admin_caps.length) router.push('/');
});
</script>

<style lang="stylus" scoped>

.character,.item
  display flex
  flex-flow row nowrap
  align-items center
  margin-left 1em
  span
    font-size .8em
    padding-right 1em
    text-transform uppercase
    font-weight bold
    opacity .7
  .amount
    display flex
    flex-flow row nowrap
    align-items center
    color #eee
    text-shadow 1px 1px 1px rgba(0,0,0,.3)
.withdraw
  margin-top 1em
  width 200px

.caps
  display flex
  flex-flow row nowrap
  .cap
    display flex
    flex-flow row nowrap
    align-items center
    padding .5em 1em
    border 1px solid rgba(#eee, .4)
    border-radius 12px
    a.id
      font-size .8em
      text-decoration underline
      font-style italic
      cursor pointer
      opacity .7
      margin-right 1em
</style>
