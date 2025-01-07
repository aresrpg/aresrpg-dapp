import {
  BoxGeometry,
  Color,
  Group,
  LoopOnce,
  Mesh,
  Object3D,
  Quaternion,
  Texture,
  Vector3,
} from 'three'
import { CustomizableTexture } from '@aresrpg/aresrpg-engine'

import dispose from '../utils/three/dispose.js'

import { MODELS, find_head_bone } from './models.js'
import { CartoonRenderpass } from './rendering/cartoon_renderpass.js'
import { context } from './game.js'
import { create_billboard_text } from './rendering/billboard_text.js'

const MODEL_FORWARD = new Vector3(0, 0, 1)

function fade_to_animation(from, to, duration = 0.3) {
  if (from !== to) {
    from?.fadeOut(duration)
    to.reset().fadeIn(duration).play()
  }
}

// const CHARACTER_ANIMATIONS = [
//   'IDLE',
//   'RUN',
//   'JUMP',
//   'JUMP_RUN',
//   'FALL',
//   'DEATH',
//   'ATTACK_CAC',
//   'SPELL_BUFF',
//   'SPELL_TARGET',
//   'DANCE',
//   'SIT',
//   'WALK',
// ]

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
          console.log('customizable_texture', {
            match,
            customizable_texture,
            model,
          })
          if (customizable_texture) {
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

    for (const expected_layername of ['color1', 'color2', 'color3']) {
      if (
        !customizable_texture_diffuse.layerNames.includes(expected_layername)
      ) {
        throw new Error(
          `Diffuse customizable texture is supposed to have a layer named "${expected_layername}".`,
        )
      }
    }

    return {
      texture: customizable_texture_diffuse,
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

function entity_spawner(
  load_model,
  { skin, height, radius, scale = 1, hair = null },
) {
  return async ({ id, name = '', scene_override = null, scale_factor = 1 }) => {
    const { model, compute_animations, set_variant, textures } =
      await load_model()
    const { mixer, actions } = compute_animations()

    model.scale.set(
      scale * scale_factor,
      scale * scale_factor,
      scale * scale_factor,
    )

    const origin = new Group()
    const title = create_billboard_text()

    title.fontSize = 0.2
    title.color = 'white'
    title.anchorX = 'center'
    title.outlineWidth = 0.02
    title.text = name
    title.layers.set(CartoonRenderpass.non_outlined_layer)

    const hitbox = new Mesh(
      new BoxGeometry(radius, height, radius),
      // new MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
    )

    hitbox.name = 'hitbox'
    hitbox.visible = false
    hitbox.geometry.computeBoundingBox()

    origin.add(title)
    origin.add(model)
    origin.add(hitbox)

    title.position.y += height * scale_factor + 0.7
    model.position.y -= height * 0.5

    const scene = scene_override || context.scene

    scene.add(origin)

    let current_animation = actions.IDLE
    let low_priority = false
    let last_animation_frame = 0

    if (actions.JUMP) actions.JUMP.setLoop(LoopOnce, 1)

    current_animation?.play()

    // this function must be atomic, to avoid having both hair and helmet equipped at the same time
    let equip_promise = Promise.resolve()

    async function equip_hat(hat) {
      equip_promise = equip_promise.then(async () => {
        const head = find_head_bone(model)
        head.clear()

        if (!hat) return
        const { model: hat_model } = await MODELS[hat.item_type]
        head.add(hat_model)
      })
      return equip_promise
    }

    console.log('create_custom_colors_api', { skin, textures })
    const custom_colors = create_custom_colors_api(model, textures)

    return {
      id,
      floating_title: title,
      height,
      radius,
      mixer,
      object3d: origin,
      jump_time: 0,
      audio: null,
      skin,
      action: 'IDLE',
      move(position) {
        // @ts-ignore
        if (origin.position.distanceTo(position) < 0.01) return
        origin.position.copy(position)
      },
      rotate(movement) {
        // Normalize the movement vector in the horizontal plane (x-z)
        const flat_movement = movement.clone().setY(0).normalize()
        // Calculate the target quaternion: this rotates modelForward to align with flatMovement
        const quaternion = new Quaternion().setFromUnitVectors(
          MODEL_FORWARD,
          flat_movement,
        )
        origin.quaternion.copy(quaternion)
      },
      set_low_priority(is_low) {
        low_priority = is_low
      },
      remove() {
        scene.remove(origin)
        title.dispose()
        dispose(origin)

        if (custom_colors) {
          custom_colors.texture.dispose()
        }
      },
      animate(name) {
        // allow to skip some animation frames when the entity is far away
        if (low_priority) {
          last_animation_frame++
          if (last_animation_frame < 4) return
          last_animation_frame = 0
        }

        const animation = actions[name]
        if (animation && animation !== current_animation) {
          fade_to_animation(current_animation, animation)
          current_animation = animation
        }
      },
      position: origin.position,
      target_position: null,
      set_variant,
      custom_colors,
      equip_hat,
      async set_hair() {
        if (id === 'default') return
        await equip_hat({ item_type: hair })
      },
    }
  }
}

export const ENTITIES = {
  /** @return {Promise<Type.ThreeEntity>} */
  async from_character({ name, id, classe, sex, skin = null }) {
    const type = ENTITIES[skin || `${classe}_${sex}`]

    if (type) return await type({ name, id })
    return await ENTITIES.oeuftermath({ name: 'Bouftou', id })
  },

  // ====== CHARACTERS ======

  senshi_male: entity_spawner(() => MODELS.senshi_male, {
    height: 1.5,
    radius: 0.8,
    skin: 'senshi_male',
    hair: 'senshi_male_hair',
  }),
  senshi_female: entity_spawner(() => MODELS.senshi_female, {
    height: 1.5,
    radius: 0.8,
    skin: 'senshi_female',
    hair: 'senshi_female_hair',
  }),
  yajin_male: entity_spawner(() => MODELS.yajin_male, {
    height: 1.5,
    radius: 0.8,
    skin: 'yajin_male',
    hair: 'yajin_male_hair',
  }),
  yajin_female: entity_spawner(() => MODELS.yajin_female, {
    height: 1.5,
    radius: 0.8,
    skin: 'yajin_female',
    hair: 'yajin_female_hair',
  }),
  primemachin: entity_spawner(() => MODELS.primemachin, {
    height: 1.5,
    radius: 0.8,
    skin: 'primemachin',
    hair: 'primemachin_hair',
  }),
  anima: entity_spawner(() => MODELS.anima, {
    height: 1.5,
    radius: 0.8,
    skin: 'anima',
    hair: 'anima_hair',
  }),

  // ====== MOBS ======

  araknomath: entity_spawner(() => MODELS.araknomath, {
    height: 1.5,
    radius: 0.8,
    skin: 'araknomath',
  }),
  bouftou: entity_spawner(() => MODELS.bouftou, {
    height: 1.5,
    radius: 0.8,
    skin: 'bouftou',
  }),
  hophop: entity_spawner(() => MODELS.hophop, {
    height: 1.5,
    radius: 0.8,
    skin: 'hophop',
  }),
  moka: entity_spawner(() => MODELS.moka, {
    height: 1.5,
    radius: 0.8,
    skin: 'moka',
  }),
  moyumi: entity_spawner(() => MODELS.moyumi, {
    height: 1.5,
    radius: 0.8,
    skin: 'moyumi',
  }),

  // ====== PETS ======

  suifren_capy: entity_spawner(() => MODELS.suifren_capy, {
    height: 0.75,
    radius: 0.75,
    skin: 'suifren_capy',
  }),
  suifren_bullshark: entity_spawner(() => MODELS.suifren_bullshark, {
    height: 0.75,
    radius: 0.75,
    skin: 'suifren_bullshark',
  }),
  vaporeon: entity_spawner(() => MODELS.vaporeon, {
    height: 0.85,
    radius: 0.75,
    skin: 'vaporeon',
    scale: 0.9,
  }),
  suicune: entity_spawner(() => MODELS.suicune, {
    height: 0.85,
    radius: 0.75,
    skin: 'suicune',
    scale: 0.9,
  }),
  corbac: entity_spawner(() => MODELS.corbac, {
    height: 0.75,
    radius: 0.75,
    skin: 'corbac',
  }),
  krinan: entity_spawner(() => MODELS.krinan, {
    height: 0.75,
    radius: 0.75,
    skin: 'krinan',
  }),
  mosho: entity_spawner(() => MODELS.mosho, {
    height: 0.75,
    radius: 0.75,
    skin: 'mosho',
  }),
  oeuftermath: entity_spawner(() => MODELS.oeuftermath, {
    height: 0.75,
    radius: 0.75,
    skin: 'oeuftermath',
  }),
  siluri: entity_spawner(() => MODELS.siluri, {
    height: 0.75,
    radius: 0.75,
    skin: 'siluri',
  }),
  talokan: entity_spawner(() => MODELS.talokan, {
    height: 0.75,
    radius: 0.75,
    skin: 'talokan',
  }),
  yago: entity_spawner(() => MODELS.yago, {
    height: 0.75,
    radius: 0.75,
    skin: 'yago',
  }),
}
