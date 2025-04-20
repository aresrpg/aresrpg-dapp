import {
  BoxGeometry,
  Color,
  Group,
  LoopOnce,
  Mesh,
  Quaternion,
  Vector3,
} from 'three'

import dispose from '../utils/three/dispose.js'
import { get_player_skin } from '../utils/three/skin.js'

import { MODELS, find_bone } from './models.js'
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
  { height, radius, scale = 1, hair = null },
) {
  return async ({ id, name = '', scene_override = null, scale_factor = 1 }) => {
    const { model, compute_animations, set_variant, variants, custom_colors } =
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

    title.position.y += height * scale_factor + 0.9
    model.position.y -= height * 0.5

    const scene = scene_override || context.scene

    scene.add(origin)

    let current_animation = actions.IDLE
    let low_priority = false
    let last_animation_frame = 0

    if (actions.JUMP) actions.JUMP.setLoop(LoopOnce, 1)

    current_animation?.play()

    // this function must be atomic, to avoid having both hair and helmet equipped at the same time
    let equip_items_promise = Promise.resolve()
    let custom_hat_colors = null

    async function equip_hat(hat) {
      // @ts-ignore
      const head = find_bone(model, 'Head')
      head.clear()

      if (!hat) return

      const [type, variant] = hat.item_type.split('-')

      const {
        model: hat_model,
        custom_colors: new_custom_hat_colors,
        set_variant,
      } = (await MODELS[type]) ?? {}

      if (!hat_model) return
      if (variant) set_variant(variant)

      head.add(hat_model)
      custom_hat_colors = new_custom_hat_colors
    }

    async function equip_cape(cape) {
      // @ts-ignore
      const back = find_bone(model, 'cape')
      back.clear()

      if (!cape) return

      const [type, variant] = cape.item_type.split('-')

      const { model: cape_model, set_variant } = (await MODELS[type]) ?? {}

      if (!cape_model) return
      if (variant) set_variant(variant)

      cape_model.rotation.set(Math.PI, 0, 0)
      back.add(cape_model)
    }

    function set_colors(
      { color_1, color_2, color_3 },
      renderer = context.renderer,
    ) {
      if (!custom_colors)
        throw new Error('This entity does not support custom colors')

      custom_colors.set_color1(color_1)
      custom_hat_colors?.set_color1(color_1)

      custom_colors.set_color2(color_2)
      custom_hat_colors?.set_color2(color_2)

      custom_colors.set_color3(color_3)
      custom_hat_colors?.set_color3(color_3)

      if (custom_colors.needsUpdate()) custom_colors.update(renderer)
      if (custom_hat_colors?.needsUpdate()) custom_hat_colors.update(renderer)
    }

    if (variants.length) set_variant(variants[0])

    return {
      id,
      floating_title: title,
      height,
      radius,
      mixer,
      object3d: origin,
      jump_time: 0,
      audio: null,
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
      /** @param {Type.SuiCharacter} sui_character */
      async set_equipment(sui_character) {
        equip_items_promise = equip_items_promise.then(async () => {
          const skin = get_player_skin(sui_character)

          if (id === 'default' || skin) return

          await equip_hat(sui_character.hat || { item_type: hair })
          await equip_cape(sui_character.cloak)

          set_colors({
            color_1: new Color(sui_character.color_1),
            color_2: new Color(sui_character.color_2),
            color_3: new Color(sui_character.color_3),
          })
        })
        return equip_items_promise
      },
      set_colors,
    }
  }
}

export const ENTITIES = {
  /** @return {Promise<Type.ThreeEntity>} */
  async from_character(sui_character) {
    const { name, id, classe, sex } = sui_character
    const skin = get_player_skin(sui_character)
    const type = ENTITIES[skin ?? `${classe}_${sex}`]

    if (type) return await type({ name, id })
    return await ENTITIES.ghost({ name: 'Void', id })
  },

  // ====== CHARACTERS ======

  // TODO: Remove the MODELS proxy as it is ambiguous

  senshi_male: entity_spawner(() => MODELS.senshi_male, {
    height: 1.5,
    radius: 0.8,
    hair: 'senshi_male_hair',
  }),
  senshi_female: entity_spawner(() => MODELS.senshi_female, {
    height: 1.5,
    radius: 0.8,
    hair: 'senshi_female_hair',
  }),
  yajin_male: entity_spawner(() => MODELS.yajin_male, {
    height: 1.5,
    radius: 0.8,
    hair: 'yajin_male_hair',
  }),
  yajin_female: entity_spawner(() => MODELS.yajin_female, {
    height: 1.5,
    radius: 0.8,
    hair: 'yajin_female_hair',
  }),
  primemachin: entity_spawner(() => MODELS.primemachin, {
    height: 1.5,
    radius: 0.8,
  }),
  anima: entity_spawner(() => MODELS.anima, {
    height: 1.5,
    radius: 0.8,
  }),
  ghost: entity_spawner(() => MODELS.ghost, {
    height: 1.5,
    radius: 0.8,
  }),

  // ====== MOBS ======

  aragne: entity_spawner(() => MODELS.aragne, {
    height: 1.5,
    radius: 0.8,
  }),
  araknomath: entity_spawner(() => MODELS.araknomath, {
    height: 1.5,
    radius: 0.8,
  }),
  fuwa: entity_spawner(() => MODELS.fuwa, {
    height: 1.5,
    radius: 0.8,
    scale: 1.7,
  }),
  hophop: entity_spawner(() => MODELS.hophop, {
    height: 1.5,
    radius: 0.8,
  }),
  moka: entity_spawner(() => MODELS.moka, {
    height: 1.5,
    radius: 0.8,
  }),
  moyumi: entity_spawner(() => MODELS.moyumi, {
    height: 1.5,
    radius: 0.8,
  }),

  // ====== PETS ======

  suifren_capy: entity_spawner(() => MODELS.suifren_capy, {
    height: 0.75,
    radius: 0.75,
  }),
  suifren_bullshark: entity_spawner(() => MODELS.suifren_bullshark, {
    height: 0.75,
    radius: 0.75,
  }),
  vaporeon: entity_spawner(() => MODELS.vaporeon, {
    height: 0.85,
    radius: 0.75,
    scale: 0.9,
  }),
  suicune: entity_spawner(() => MODELS.suicune, {
    height: 0.85,
    radius: 0.75,
    scale: 0.9,
  }),
  corbac: entity_spawner(() => MODELS.corbac, {
    height: 0.75,
    radius: 0.75,
  }),
  krinan: entity_spawner(() => MODELS.krinan, {
    height: 0.75,
    radius: 0.75,
  }),
  mosho: entity_spawner(() => MODELS.mosho, {
    height: 0.75,
    radius: 0.75,
  }),
  oeuftermath: entity_spawner(() => MODELS.oeuftermath, {
    height: 0.75,
    radius: 0.75,
    scale: 0.5,
  }),
  siluri: entity_spawner(() => MODELS.siluri, {
    height: 0.75,
    radius: 0.75,
  }),
  talokan: entity_spawner(() => MODELS.talokan, {
    height: 0.75,
    radius: 0.75,
  }),
  yago: entity_spawner(() => MODELS.yago, {
    height: 0.75,
    radius: 0.75,
  }),
}
