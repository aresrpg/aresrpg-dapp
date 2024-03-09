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
import { VoxelMap, WorldGenerator } from '@aresrpg/aresrpg-world'

import dispose from '../three-utils/dispose'

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
  const cameraControl = new OrbitControls(camera, renderer.domElement)

  const scene = new Scene()
  const noiseScale = 1 / 8 // 1 unit of noise per N voxels
  const bmin = new Vector3(0, 0, 0)
  const bmax = new Vector3(256, 130, 256)
  const bbox = new Box3(bmin, bmax)
  const voxelMap = new VoxelMap(bbox)
  const worldGen = new WorldGenerator(noiseScale)
  const axisHelper = new AxesHelper(500)

  const terrain = new AresRpgEngine.Terrain(voxelMap)

  // worldGen.fill(voxelMap.voxelsOctree, bbox);

  camera.position.set(-50, 100, -50)
  cameraControl.target.set(voxelMap.size.x / 2, 0, voxelMap.size.z / 2)

  canvas.appendChild(renderer.domElement)
  renderer.setClearColor(0xbdbdbd)

  const resize_handler = on_resize({ renderer, camera })

  resize_handler()

  window.addEventListener('resize', resize_handler)

  scene.add(terrain.container)
  scene.add(axisHelper)

  terrain.showEntireMap()

  function render() {
    cameraControl.update()
    terrain.updateUniforms()
    renderer.render(scene, camera)
    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)

  return {
    dispose: () => {
      window.removeEventListener('resize', resize_handler)

      scene.remove(terrain.container)
      scene.remove(axisHelper)

      renderer.dispose()
      cameraControl.dispose()

      dispose(scene)

      canvas.removeChild(renderer.domElement)
    },
  }
}
