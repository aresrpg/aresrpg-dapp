<template lang="pug">
.page
  img.logo(src="../assets/logo.png")
  img.spinner(src="../assets/loadingcircle.png")
  img.spinner2(src="../assets/loadingcircle.png")
</template>

<script setup>
const props = defineProps(['logo']);
</script>

<style lang="stylus" scoped>
.page
  width 100vw
  height 100vh

  img
    position absolute
    top 50%
    left @top
    transform translate(-50%, -50%)

    &.logo
      width 50px
      object-fit contain
      left 50.5%
      animation float 3s ease-in-out infinite alternate

    &.spinner
      width 200px
      object-fit contain
      opacity .5
      filter drop-shadow(1px 2px 3px black)
      animation rotate 10s ease-in-out infinite reverse
    &.spinner2
      width 250px
      object-fit contain
      opacity .7
      filter drop-shadow(1px 2px 3px black)
      animation rotate 5s ease-in-out infinite reverse

@keyframes rotate
  from
    transform translate(-50%, -50%) rotate(0turn)
  to
    transform translate(-50%, -50%) rotate(1turn)

@keyframes float
  from
    transform translate(-50%, -50%) translateY(-5px)

  to
    transform translate(-50%, -50%) translateY(5px)
</style>
