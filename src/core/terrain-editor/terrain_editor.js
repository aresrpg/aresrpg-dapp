import {
  Vector3,
  WebGLRenderer,
  PerspectiveCamera,
  Box3,
  Scene,
  AxesHelper,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  ProcGenLayer,
  VoxelMap,
  VoxelType,
  WorldGenerator,
} from '@aresrpg/aresrpg-world'
import { Terrain } from '@aresrpg/aresrpg-engine'

import dispose from '../three-utils/dispose'

import proc_layers_json from './proc_layers.json'

const voxel_types_mapping = height => {
  if (height < 75) return VoxelType.WATER
  else if (height < 80) return VoxelType.SAND
  else if (height < 125) return VoxelType.GRASS
  else if (height < 175) return VoxelType.ROCK
  return VoxelType.SNOW
}

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
    2000,
  )
  const camera_control = new OrbitControls(camera, renderer.domElement)

  const scene = new Scene()
  const noise_scale = 1 / 8 // 1 unit of noise per N voxels
  const map_size = Math.pow(2, 9) // 10 => 1024, 11 => 2048, 12 => 4096,..
  const bmin = new Vector3(0, 0, 0)
  const bmax = new Vector3(map_size, 256, map_size)
  const bbox = new Box3(bmin, bmax)
  const proc_layers = ProcGenLayer.fromJsonConfig({
    procLayers: proc_layers_json.noise_panels,
  })
  const world_gen = new WorldGenerator(noise_scale, proc_layers)
  // layer to render: possible values 'layer#N' or 'combination'
  const selection = 'layer#1'
  world_gen.config = { selection }
  world_gen.voxelTypeMapper = voxel_types_mapping
  const voxel_map = new VoxelMap(bbox, world_gen)

  const axis_helper = new AxesHelper(500)
  const terrain = new Terrain(voxel_map)

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
