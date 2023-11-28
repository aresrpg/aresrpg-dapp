<style lang="stylus" scoped>
.bubbles
  position absolute
  bottom 0
  left 0
  right 0
  height 1rem
  filter:url("#blob")
.bubble
  position absolute
  left var(--position, 50%)
  background linear-gradient(to top, #F1C40F, #C0392B)
  opacity .5
  border-radius 100%
  animation bubble-size var(--time, 4s) ease-in infinite var(--delay, 0s),
  bubble-move var(--time, 4s) ease-in infinite var(--delay, 0s)
  transform translate(-50%, 100%)

@keyframes bubble-size {
  0%, 75% {
      width:var(--size, 4rem);
      height:var(--size, 4rem);
  }
  100% {
      width:0rem;
      height:0rem;
  }
}
@keyframes bubble-move {
    0% {
        bottom:-4rem;
    }
    100% {
        bottom:var(--distance, 10rem);
    }
}
</style>

<template lang="pug">
.bubbles
  - for (var i = 0; i < 128; i++)
      div.bubble(
        style=`
        --size:${2+Math.random()*4}rem; --distance:${6+Math.random()*4}rem; --position:${-5+Math.random()*110}%; --time:${2+Math.random()*2}s; --delay:${-1*(2+Math.random()*2)}s;
        `)
</template>
