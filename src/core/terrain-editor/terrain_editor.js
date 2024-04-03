import { AresRpgEngine } from '@aresrpg/aresrpg-engine'
import {
  Vector3,
  WebGLRenderer,
  PerspectiveCamera,
  Box3,
  Scene,
  AxesHelper,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import dispose from '../utils/three/dispose'

function on_resize({ renderer, camera }) {
  return () => {
    const width = window.innerWidth
    const height = window.innerHeight
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}

export function create_terrain_editor(canvas) {
  const renderer = new WebGLRenderer()
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  )
  const camera_control = new OrbitControls(camera, renderer.domElement)

  const scene = new Scene()
  // const noise_scale = 1 / 8 // 1 unit of noise per N voxels
  const bmin = new Vector3(0, 0, 0)
  const bmax = new Vector3(256, 130, 256)
  const bbox = new Box3(bmin, bmax)
  const voxel_map = null // new VoxelMap(bbox)
  // const world_gen = new WorldGenerator(noise_scale)
  const axis_helper = new AxesHelper(500)

  const terrain = new AresRpgEngine.Terrain(voxel_map)

  // world_gen.fill(voxel_map.voxelsOctree, bbox);

  camera.position.set(-50, 100, -50)
  camera_control.target.set(voxel_map.size.x / 2, 0, voxel_map.size.z / 2)

  canvas.appendChild(renderer.domElement)
  renderer.setClearColor(0xbdbdbd)

  const resize_handler = on_resize({ renderer, camera })

  resize_handler()

  window.addEventListener('resize', resize_handler)

  scene.add(terrain.container)
  scene.add(axis_helper)

  terrain.showEntireMap()

  function render() {
    camera_control.update()
    terrain.updateUniforms()
    renderer.render(scene, camera)
    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)

  return {
    dispose: () => {
      window.removeEventListener('resize', resize_handler)

      scene.remove(terrain.container)
      scene.remove(axis_helper)

      renderer.dispose()
      camera_control.dispose()

      dispose(scene)

      canvas.removeChild(renderer.domElement)
    },
  }
}
