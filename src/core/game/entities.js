import { BoxGeometry, Group, LoopOnce, Mesh, Quaternion, Vector3 } from 'three'

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
  /** @type {() => Promise<ReturnType<Awaited<ReturnType<typeof import("../utils/three/load_model.js")["load"]>>>>} */
  load_model,
  { skin, height, radius, scale = 1, hair = null },
) {
  return async ({ id, name = '', scene_override = null, scale_factor = 1 }) => {
    const { model, compute_animations, set_variant, custom_colors } =
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
    let custom_hat_colors = null

    async function equip_hat(hat) {
      equip_promise = equip_promise.then(async () => {
        // @ts-ignore
        const head = find_head_bone(model)
        head.clear()

        if (!hat) return
        // const { item_type } = hat
        // if(!LOADED_HATS.has(item_type))

        const { model: hat_model, custom_colors: new_custom_hat_colors } =
          await MODELS[hat.item_type]
        head.add(hat_model)
        custom_hat_colors = new_custom_hat_colors
      })
      return equip_promise
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

        if (custom_colors) {
          custom_colors.dispose()
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
      set_colors({ color_1, color_2, color_3 }, renderer = context.renderer) {
        if (!custom_colors)
          throw new Error('This entity does not support custom colors')

        if (!custom_colors.get_color1().equals(color_1)) {
          custom_colors.set_color1(color_1)
          custom_hat_colors?.set_color1(color_1)
        }

        if (!custom_colors.get_color2().equals(color_2)) {
          custom_colors.set_color2(color_2)
          custom_hat_colors?.set_color2(color_2)
        }

        if (!custom_colors.get_color3().equals(color_3)) {
          custom_colors.set_color3(color_3)
          custom_hat_colors?.set_color3(color_3)
        }

        if (custom_colors.needsUpdate()) custom_colors.texture.update(renderer)
        if (custom_hat_colors?.needsUpdate()) custom_hat_colors.update(renderer)
      },
    }
  }
}

export const ENTITIES = {
  /** @return {Promise<Type.ThreeEntity>} */
  async from_character({ name, id, classe, sex, skin = null }) {
    const type = ENTITIES[skin || `${classe}_${sex}`]

    if (type) return await type({ name, id })
    return await ENTITIES.oeuftermath({ name: 'Oeuftermath', id })
  },

  // ====== CHARACTERS ======

  // TODO: Remove the MODELS proxy as it is ambiguous

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

  aragne: entity_spawner(() => MODELS.aragne, {
    height: 1.5,
    radius: 0.8,
    skin: 'aragne',
  }),
  araknomath: entity_spawner(() => MODELS.araknomath, {
    height: 1.5,
    radius: 0.8,
    skin: 'araknomath',
  }),
  bouftou: entity_spawner(() => MODELS.bouftou, {
    height: 1.5,
    radius: 0.8,
    skin: 'bouftou',
    scale: 1.2,
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
    scale: 0.5,
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
