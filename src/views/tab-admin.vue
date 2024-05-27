<template lang="pug">
sectionContainer
  sectionHeader(title="Admin overview" desc="Success is not given, it's taken. You have to be aggressive and go after what you want in life." color="#FF3D00")
    .character
      span Character royalties:
      .amount {{ (+mists_to_sui(admin_policies.character_profits)).toFixed(2) }} #[TokenBrandedSui]
    .item
      span Item royalties:
      .amount {{ (+mists_to_sui(admin_policies.item_profits)).toFixed(2) }} #[TokenBrandedSui]
    .withdraw
      vs-button(type="gradient" color="#03A9F4" @click="withdraw") Withdraw
</template>

<script setup>
import { inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import sectionHeader from '../components/misc/section-header.vue';
import sectionContainer from '../components/misc/section-container.vue';
import {
  mists_to_sui,
  sui_withdraw_policies_profit,
  sui_get_policies_profit,
} from '../core/sui/client.js';
import { decrease_loading, increase_loading } from '../core/utils/loading.js';
import toast from '../toast.js';

// @ts-ignore
import TokenBrandedSui from '~icons/token-branded/sui';

const router = useRouter();
const admin_policies = inject('admin_policies');

async function withdraw() {
  try {
    increase_loading();
    await sui_withdraw_policies_profit();
    const { character_profits, item_profits } = await sui_get_policies_profit();

    admin_policies.character_profits = character_profits;
    admin_policies.item_profits = item_profits;

    toast.dark('Profits withdrawn, soon bali ?', 'GG wp!');
  } catch (error) {
    console.error(error);
  }
  decrease_loading();
}

onMounted(() => {
  if (!admin_policies.is_owner) router.push('/');
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
</style>
