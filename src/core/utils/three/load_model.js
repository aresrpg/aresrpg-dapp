import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import {
  AnimationMixer,
  DefaultLoadingManager,
  Object3D,
  Texture,
  WebGLRenderer,
} from 'three'
import { MeshoptDecoder } from 'meshoptimizer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { CustomizableTexture } from '@aresrpg/aresrpg-engine'

import GLTFMaterialsVariantsExtension from './KHR_material_variants.js'

const GLTF_LOADER = new GLTFLoader(DefaultLoadingManager)
const DRACO_LOADER = new DRACOLoader(DefaultLoadingManager)
const KTX2_LOADER = new KTX2Loader(DefaultLoadingManager)

DRACO_LOADER.setDecoderPath(
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
)
DRACO_LOADER.setDecoderConfig({ type: 'js' })

GLTF_LOADER.setDRACOLoader(DRACO_LOADER)
GLTF_LOADER.setKTX2Loader(KTX2_LOADER)
GLTF_LOADER.setMeshoptDecoder(MeshoptDecoder)

GLTF_LOADER.register(parser => new GLTFMaterialsVariantsExtension(parser))

function create_customizable_textures(
  /** @type ReadonlyArray<Texture> */
  textures,
) {
  /** @type Map<string, Texture> */
  const base_textures = new Map()
  for (const texture of textures) {
    const match = texture.name.match(/(.+)_base$/)
    if (match && match[1]) {
      if (base_textures.has(match[1])) {
        throw new Error(`Duplicate base texture "${texture.name}".`)
      }
      base_textures.set(match[1], texture)
    }
  }

  const MAX_CUSTOMIZABLE_TEXTURES_COUNT = 3

  /** @type Map<string, CustomizableTexture> */
  const customizable_textures = new Map()
  for (const [base_texture_name, base_texture] of base_textures.entries()) {
    /** @type Map<string, Texture> */
    const additional_textures = new Map()
    for (let i = 1; i <= MAX_CUSTOMIZABLE_TEXTURES_COUNT; i++) {
      const layer_texture = textures.find(
        tex => tex.name === `${base_texture_name}_color${i}`,
      )
      if (!layer_texture) {
        break
      }
      additional_textures.set(`color${i}`, layer_texture)
    }

    const customizable_texture = new CustomizableTexture({
      baseTexture: base_texture,
      additionalTextures: additional_textures,
    })
    customizable_textures.set(base_texture_name, customizable_texture)
  }

  return customizable_textures
}

function create_custom_colors_api(
  /** @type Object3D */ model,
  /** @type ReadonlyArray<Texture> */ textures,
) {
  /** @type Map<string, CustomizableTexture> */
  const customizable_textures = create_customizable_textures(textures)
  if (customizable_textures.size > 0) {
    // attach the customizable textures on the model
    model.traverse((/** @type any */ child) => {
      if (child.material && child.material.map) {
        const match = child.material.map.name.match(/(.+)_base/)
        if (match && match[1]) {
          const customizable_texture = customizable_textures.get(match[1])
          if (customizable_texture) {
            child.material = child.material.clone()
            child.material.map = customizable_texture.texture
          }
        }
      }
    })

    const customizable_texture_diffuse = customizable_textures.get('diffuse')
    if (!customizable_texture_diffuse || customizable_textures.size > 1) {
      throw new Error(
        `Only diffuse texture is customizable. Got ${Array.from(customizable_textures.keys()).join(';')}.`,
      )
    }

    try {
      for (const expected_layername of ['color1', 'color2', 'color3']) {
        if (
          !customizable_texture_diffuse.layerNames.includes(expected_layername)
        ) {
          throw new Error(
            `Diffuse customizable texture is supposed to have a layer named "${expected_layername}".`,
          )
        }
      }
    } catch (error) {}

    return {
      needsUpdate() {
        return customizable_texture_diffuse.needsUpdate
      },
      update(/** @type WebGLRenderer */ renderer) {
        customizable_texture_diffuse.update(renderer)
      },
      dispose() {
        customizable_texture_diffuse.dispose()
      },
      set_color1(value) {
        customizable_texture_diffuse.setLayerColor('color1', value)
      },
      get_color1() {
        return customizable_texture_diffuse.getLayerColor('color1')
      },

      set_color2(value) {
        customizable_texture_diffuse.setLayerColor('color2', value)
      },
      get_color2() {
        return customizable_texture_diffuse.getLayerColor('color2')
      },

      set_color3(value) {
        customizable_texture_diffuse.setLayerColor('color3', value)
      },
      get_color3() {
        return customizable_texture_diffuse.getLayerColor('color3')
      },
    }
  }

  return null
}

export async function load(
  path,
  { env_map_intensity = 0.5, mesh_name = 'Model' } = {},
) {
  const loaded = await GLTF_LOADER.loadAsync(path)
  // @ts-ignore
  const textures = await Promise.all(Object.values(loaded.parser.textureCache))
  // @ts-ignore
  const { scene, animations, functions } = loaded

  scene.traverse(child => {
    // @ts-ignore
    // if (child.isBone) child.visible = false

    // @ts-ignore
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      // @ts-ignore
      Object.assign(child.material, {
        envMapIntensity: env_map_intensity,
      })
    }
  })

  return () => {
    const cloned = clone(scene)

    return {
      model: cloned,
      textures,
      custom_colors: create_custom_colors_api(cloned, textures),
      skinned_mesh: cloned.getObjectByName(mesh_name),
      async set_variant(variant) {
        await functions.selectVariant(cloned, variant)
      },
      compute_animations() {
        const mixer = new AnimationMixer(cloned)
        return {
          mixer,
          actions: Object.fromEntries(
            animations.map(animation => [
              animation.name,
              mixer.clipAction(animation),
            ]),
          ),
        }
      },
    }
  }
}
