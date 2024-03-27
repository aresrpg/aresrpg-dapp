/** @type {Type.Module} */
export default function () {
  return {
    tick(_, { pool }, delta) {
      Object.values(pool).forEach(value => {
        if (typeof value === 'function') return
        value.instanced_entity.entity.tick(delta)
      })
    },
  }
}
