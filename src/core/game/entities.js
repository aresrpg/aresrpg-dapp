import { createDerivedMaterial } from 'troika-three-utils'
import { Text } from 'troika-three-text'
import {
  BoxGeometry,
  Group,
  LoopOnce,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'

import dispose from '../utils/three/dispose.js'

import { MATRIX, MODELS, find_head_bone } from './models.js'
import { CartoonRenderpass } from './rendering/cartoon_renderpass.js'
import { context } from './game.js'

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

export function create_billboard_material(base_material, keep_aspect) {
  return createDerivedMaterial(base_material, {
    // Declaring custom uniforms
    uniforms: {
      uSize: { value: keep_aspect ? 0.1 : 0.15 },
      uScale: { value: 1 },
    },
    // Adding GLSL code to the vertex shader's top-level definitions
    vertexDefs: `
uniform float uSize;
uniform float uScale;
`,
    // Adding GLSL code at the end of the vertex shader's main function
    vertexMainOutro: keep_aspect
      ? `
vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float distance = length(-mvPosition.xyz);
float computedScale = uSize * uScale * distance;
mvPosition.xyz += position * computedScale;
gl_Position = projectionMatrix * mvPosition;
`
      : `
vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
vec3 scale = vec3(
  length(modelViewMatrix[0].xyz),
  length(modelViewMatrix[1].xyz),
  length(modelViewMatrix[2].xyz)
  );
// size attenuation: scale *= -mvPosition.z * 0.2;
mvPosition.xyz += position * scale;
gl_Position = projectionMatrix * mvPosition;
`,
    // No need to modify fragment shader for billboarding effect
  })
}

function spawn_entity(clone_model, { skin, height, radius, scale = 1 }) {
  return ({ id, name = '', scene_override = null, scale_factor = 1 }) => {
    const { model, compute_animations, set_variant } = clone_model()
    const { mixer, actions } = compute_animations()

    model.scale.set(
      scale * scale_factor,
      scale * scale_factor,
      scale * scale_factor,
    )

    const origin = new Group()
    const title = new Text()

    title.fontSize = 0.2
    title.color = 'white'
    title.anchorX = 'center'
    title.outlineWidth = 0.02
    title.material = create_billboard_material(new MeshBasicMaterial(), false)
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

    title.position.y += height * scale_factor + 0.2
    model.position.y -= height * 0.5

    const scene = scene_override || context.scene

    scene.add(origin)

    let current_animation = actions.IDLE
    let low_priority = false
    let last_animation_frame = 0

    if (actions.JUMP) actions.JUMP.setLoop(LoopOnce, 1)

    current_animation?.play()

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
      equip_hat(hat) {
        const head = find_head_bone(model)

        if (!hat) {
          head.clear()
          return
        }

        const { model: hat_model } = MODELS[hat.item_type]()
        const apply_matrix = MATRIX[hat.item_type][skin]

        apply_matrix(hat_model)

        head.add(hat_model)
      },
    }
  }
}

export const ENTITIES = {
  /** @return {Type.ThreeEntity} */
  from_character({ name, id, classe, sex, skin = null }) {
    const type = ENTITIES[skin || `${classe}_${sex}`]

    if (type) return type({ name, id })
    return ENTITIES.afegg({ name: 'Oeuftermath', id })
  },

  // ====== CHARACTERS ======

  iop_male: spawn_entity(MODELS.iop_male, {
    height: 1.5,
    radius: 0.8,
    skin: 'iop_male',
  }),
  iop_female: spawn_entity(MODELS.iop_female, {
    height: 1.5,
    radius: 0.8,
    skin: 'iop_female',
  }),
  sram_male: spawn_entity(MODELS.sram_male, {
    height: 1.5,
    radius: 0.8,
    skin: 'sram_male',
  }),
  sram_female: spawn_entity(MODELS.sram_female, {
    height: 1.5,
    radius: 0.8,
    skin: 'sram_female',
  }),
  primemachin: spawn_entity(MODELS.primemachin, {
    height: 1.5,
    radius: 0.8,
    skin: 'primemachin',
  }),

  // ====== MOBS ======

  chafer: spawn_entity(MODELS.chafer, {
    height: 1.5,
    radius: 0.8,
    skin: 'chafer',
  }),
  hop_bunny: spawn_entity(MODELS.hop_bunny, {
    height: 1.5,
    radius: 0.8,
    skin: 'hop_bunny',
    scale: 0.8,
  }),

  // ====== PETS ======

  suifren_capy: spawn_entity(MODELS.suifren_capy, {
    height: 0.75,
    radius: 0.75,
    skin: 'suifren_capy',
  }),
  suifren_bullshark: spawn_entity(MODELS.suifren_bullshark, {
    height: 0.75,
    radius: 0.75,
    skin: 'suifren_bullshark',
  }),
  afegg: spawn_entity(MODELS.afegg, {
    height: 0.75,
    radius: 0.75,
    skin: 'afegg',
  }),
  vaporeon: spawn_entity(MODELS.vaporeon, {
    height: 0.85,
    radius: 0.75,
    skin: 'vaporeon',
    scale: 0.9,
  }),
  suicune: spawn_entity(MODELS.suicune, {
    height: 0.85,
    radius: 0.75,
    skin: 'suicune',
    scale: 0.9,
  }),
  pirate_parrot: spawn_entity(MODELS.pirate_parrot, {
    height: 0.75,
    radius: 0.75,
    skin: 'pirate_parrot',
  }),
}
