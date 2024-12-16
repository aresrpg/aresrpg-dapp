import {
  BoxGeometry,
  Color,
  Group,
  LoopOnce,
  Mesh,
  Quaternion,
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

    const /** @type Map<string, CustomizableTexture> */ customizable_textures =
        new Map()
    {
      // retrieve the different channels of the customizable textures on this model
      const customizable_textures_parts = {}
      for (const texture of textures) {
        const match = texture.name.match(
          /_(.+)_(diffuse|basecolour|accent1|accent2)/,
        )
        if (match && match[1] && match[2]) {
          const textureBasename = match[1]
          const channelName = match[2]
          if (!customizable_textures_parts[textureBasename]) {
            customizable_textures_parts[textureBasename] = {}
          }
          customizable_textures_parts[textureBasename][channelName] = texture
        }
      }

      // assemble the channels to create customizable textures
      for (const [textureBasename, channels] of Object.entries(
        customizable_textures_parts,
      )) {
        if (
          channels.diffuse &&
          channels.basecolour &&
          channels.accent1 &&
          channels.accent2
        ) {
          if (customizable_textures.has(textureBasename)) {
            throw new Error(
              `Duplicate customizable texture "${textureBasename}".`,
            )
          }

          const customizable_texture = new CustomizableTexture({
            baseTexture: channels.diffuse,
            additionalTextures: new Map([
              ['basecolour', channels.basecolour],
              ['accent1', channels.accent1],
              ['accent2', channels.accent2],
            ]),
          })
          customizable_textures.set(textureBasename, customizable_texture)
        }
      }

      // attach the customizable textures on the model
      model.traverse(child => {
        if (child.material && child.material.map) {
          for (const [
            name,
            customizable_texture,
          ] of customizable_textures.entries()) {
            if (child.material.map.name.endsWith(`${name}_diffuse`)) {
              child.material.map = customizable_texture.texture
              break
            }
          }
        }
      })
    }

    let custom_colors = null
    if (customizable_textures.has("x")) {
      const customizable_texture = customizable_textures.get("x");
      custom_colors = {
        texture: customizable_texture,
        set color1(value) {
          customizable_texture.setLayerColor("basecolour", value)
        },
        get color1() {
          return customizable_texture.getLayerColor("basecolour")
        },

        set color2(value) {
          customizable_texture.setLayerColor("accent1", value)
        },
        get color2() {
          return customizable_texture.getLayerColor("accent1")
        },

        set color3(value) {
          customizable_texture.setLayerColor("accent2", value)
        },
        get color3() {
          return customizable_texture.getLayerColor("accent2")
        },
      }
    }
  
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
    return await ENTITIES.afegg({ name: 'Oeuftermath', id })
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

  chafer: entity_spawner(() => MODELS.chafer, {
    height: 1.5,
    radius: 0.8,
    skin: 'chafer',
  }),
  hop_bunny: entity_spawner(() => MODELS.hop_bunny, {
    height: 1.5,
    radius: 0.8,
    skin: 'hop_bunny',
    scale: 0.8,
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
  afegg: entity_spawner(() => MODELS.afegg, {
    height: 0.75,
    radius: 0.75,
    skin: 'afegg',
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
  pirate_parrot: entity_spawner(() => MODELS.pirate_parrot, {
    height: 0.75,
    radius: 0.75,
    skin: 'pirate_parrot',
  }),
}
