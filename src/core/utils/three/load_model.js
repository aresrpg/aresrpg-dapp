import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import {
  AnimationMixer,
  Color,
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

const layer_names = {
  color1: 'color1',
  color2: 'color2',
  color3: 'color3',
}

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

  /** @type Map<string, CustomizableTexture> */
  const customizable_textures = new Map()
  for (const [base_texture_name, base_texture] of base_textures.entries()) {
    /** @type Map<string, Texture> */
    const additional_textures = new Map()
    for (const layer_name of Object.values(layer_names)) {
      const layer_texture = textures.find(
        tex => tex.name === `${base_texture_name}_${layer_name}`,
      )
      if (layer_texture) {
        additional_textures.set(layer_name, layer_texture)
      }
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
  const all_customizable_textures = create_customizable_textures(textures)
  /** @type Set<CustomizableTexture> */
  const used_customizable_textures = new Set()

  // mapping texture name -> attribute on the THREE material
  const mappings = new Map([['diffuse', 'map']])

  if (all_customizable_textures.size > 0) {
    // attach the customizable textures on the model
    model.traverse((/** @type any */ child) => {
      let material_cloned_once = false
      if (child.material) {
        for (const [texture_name, material_attribute] of mappings.entries()) {
          if (
            child.material[material_attribute] &&
            child.material[material_attribute].name === `${texture_name}_base`
          ) {
            const customizable_texture =
              all_customizable_textures.get(texture_name)
            if (customizable_texture) {
              if (!material_cloned_once) {
                child.material = child.material.clone()
                material_cloned_once = true
              }
              child.material[material_attribute] = customizable_texture.texture
              used_customizable_textures.add(customizable_texture)
            }
          }
        }
      }
    })

    for (const loaded_customizable_texture of all_customizable_textures.values()) {
      if (!used_customizable_textures.has(loaded_customizable_texture)) {
        loaded_customizable_texture.dispose()
      }
    }

    for (const customizable_texture of used_customizable_textures) {
      for (const expected_layername of Object.values(layer_names)) {
        if (!customizable_texture.layerNames.includes(expected_layername)) {
          throw new Error(
            `Customizable texture is supposed to have a layer named "${expected_layername}".`,
          )
        }
      }
    }

    const set_layer_color = (
      /** @type string */ name,
      /** @type Color */ color,
    ) => {
      for (const customizable_texture of used_customizable_textures.values()) {
        customizable_texture.setLayerColor(name, color)
      }
    }

    return {
      needsUpdate() {
        for (const customizable_texture of used_customizable_textures.values()) {
          if (customizable_texture.needsUpdate) {
            return true
          }
        }
        return false
      },
      update(/** @type WebGLRenderer */ renderer) {
        for (const customizable_texture of used_customizable_textures.values()) {
          if (customizable_texture.needsUpdate) {
            customizable_texture.update(renderer)
          }
        }
      },
      dispose() {
        for (const customizable_texture of used_customizable_textures.values()) {
          customizable_texture.dispose()
        }
      },
      set_color1(/** @type Color */ value) {
        set_layer_color(layer_names.color1, value)
      },
      set_color2(/** @type Color */ value) {
        set_layer_color(layer_names.color2, value)
      },
      set_color3(/** @type Color */ value) {
        set_layer_color(layer_names.color3, value)
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
