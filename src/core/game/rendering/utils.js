import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Uint16BufferAttribute,
} from 'three'

function create_fullscreen_quad() {
  const quad_geometry = new BufferGeometry()
  quad_geometry.setAttribute(
    'aCorner',
    new Float32BufferAttribute([-1, +1, +1, +1, -1, -1, +1, -1], 2)
  )
  quad_geometry.setIndex(new Uint16BufferAttribute([0, 2, 1, 2, 3, 1], 1))
  const fullscreen_quad = new Mesh(quad_geometry)
  fullscreen_quad.frustumCulled = false
  return fullscreen_quad
}

export { create_fullscreen_quad }
