/** @type {Type.Module} */
export default function () {
  return {
    observe({ renderer, camera, signal, composer }) {
      window.addEventListener(
        'resize',
        () => {
          const { innerWidth, innerHeight } = window
          renderer.setSize(innerWidth, innerHeight)
          camera.aspect_ratio = innerWidth / innerHeight
          composer.setSize(innerWidth, innerHeight)
        },
        { signal },
      )
    },
  }
}
