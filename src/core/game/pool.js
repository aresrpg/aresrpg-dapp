import {
  Bone,
  Group,
  LoopOnce,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { Text } from 'troika-three-text'
import { createDerivedMaterial } from 'troika-three-utils'

import { load } from '../utils/three/load_model.js'
import InstancedEntity from '../entity/InstancedEntity.js'
import dispose from '../utils/three/dispose.js'
import iop_male from '../../assets/models/iop_male.glb?url'
import iop_female from '../../assets/models/iop_female.glb?url'
import sram_male from '../../assets/models/sram_male.glb?url'
import sram_female from '../../assets/models/sram_female.glb?url'
import chafer from '../../assets/models/chafer.glb?url'
import suifren_bullshark from '../../assets/models/suifren_bullshark.glb?url'
import suifren_capy from '../../assets/models/suifren_capy.glb?url'
import afegg from '../../assets/models/afegg.glb?url'
import primemachin from '../../assets/models/primemachin.glb?url'

import { CartoonRenderpass } from './rendering/cartoon_renderpass.js'
import { gear_head_models_store } from './gear/gear_models_store.js'

function create_billboard_material(base_material, keep_aspect) {
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

const MODEL_FORWARD = new Vector3(0, 0, 1)

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

export const MODELS = {
  iop_male: await load(iop_male, {
    env_map_intensity: 0.5,
    scale: 0.9,
  }),
  iop_female: await load(iop_female, {
    env_map_intensity: 0.5,
    // scale: 1.2,
  }),
  sram_male: await load(sram_male, {
    env_map_intensity: 0.5,
    // scale: 1.2,
  }),
  sram_female: await load(sram_female, {
    env_map_intensity: 0.5,
    scale: 0.043,
  }),
  chafer: await load(chafer, {
    env_map_intensity: 0.5,
    scale: 1.2,
  }),
  suifren_bullshark: await load(suifren_bullshark, {
    env_map_intensity: 0.5,
    scale: 1.5,
  }),
  suifren_capy: await load(suifren_capy, {
    env_map_intensity: 0.2,
    scale: 1.5,
  }),
  afegg: await load(afegg, {
    env_map_intensity: 0.5,
    scale: 0.18,
  }),
  primemachin: await load(primemachin, {
    env_map_intensity: 0.5,
    scale: 0.046,
  }),
}

await gear_head_models_store.load()

function fade_to_animation(from, to, duration = 0.3) {
  if (from !== to) {
    from?.fadeOut(duration)
    to.reset().fadeIn(duration).play()
  }
}

/**
 * @param {import("three").Scene} scene
 */
export default function create_pools(scene) {
  function instanciate(clone_model, { height, radius, name, offset_y = 0 }) {
    /**
     *
     * @param {InstancedEntity} existing_instance
     */
    function create_instance(existing_instance) {
      const { model, skinned_mesh, compute_animations } = clone_model()
      const { mixer, actions } = compute_animations()

      const entity =
        existing_instance?.expand({
          skinned_mesh,
          actions,
          mixer,
        }) ||
        new InstancedEntity({
          skinned_mesh,
          actions,
          mixer,
          capacity: 30,
        })

      const body = new Group()

      body.name = `entity:body:${name}`

      scene.add(body)

      body.add(model)
      body.add(entity)

      entity.name = `instanced:${name}`

      const dispose_handlers = []

      return {
        body,
        entity,
        actions,
        mixer,
        on_dispose(handler) {
          dispose_handlers.push(handler)
        },
        dispose() {
          scene.remove(body)
          entity.dispose()
          dispose(body)
          dispose(model)
          dispose_handlers.forEach(handler => handler())
        },
      }
    }

    const instance = create_instance(null)

    if (instance.actions.JUMP) instance.actions.JUMP.setLoop(LoopOnce, 1)

    instance.actions.IDLE?.play()

    return {
      instanced_entity: instance,
      /** @type {(param: {id: string, name: string, skin: string}) => Type.ThreeEntity} */
      get({ id, name, skin }) {
        if (!id) throw new Error('id is required')

        const success = instance.entity.add_entity(id)

        if (!success) {
          instance.dispose()

          Object.assign(instance, create_instance(instance.entity))

          instance.entity.add_entity(id)
        }

        const title = new Text()

        title.fontSize = 0.2
        title.color = 'white'
        title.anchorX = 'center'
        title.outlineWidth = 0.02
        title.material = create_billboard_material(
          new MeshBasicMaterial(),
          false,
        )
        title.text = name
        title.layers.set(CartoonRenderpass.non_outlined_layer)

        scene.add(title)

        instance.entity.set_animation(id, 'IDLE')

        const current_position = new Vector3(0, 200, 0)
        let current_animation = 'IDLE'

        return {
          id,
          title,
          height,
          radius,
          jump_time: 0,
          skin,
          audio: null,
          action: 'IDLE',
          apply_state(entity) {
            entity.move(current_position)
            entity.animate(current_animation)
          },
          move(position) {
            // @ts-ignore
            if (current_position.distanceTo(position) < 0.01) return
            instance.entity.set_position(id, {
              ...position,
              y: position.y - height * 0.5 + offset_y,
            })
            // @ts-ignore
            title.position.copy({
              ...position,
              y: position.y + height + offset_y,
            })
            // @ts-ignore
            current_position.copy(position)
          },
          rotate(movement) {
            // Normalize the movement vector in the horizontal plane (x-z)
            const flat_movement = movement.clone().setY(0).normalize()
            // Calculate the target quaternion: this rotates modelForward to align with flatMovement
            const quaternion = new Quaternion().setFromUnitVectors(
              MODEL_FORWARD,
              flat_movement,
            )
            instance.entity.set_quaternion(id, quaternion)
          },
          remove() {
            scene.remove(title)
            title.geometry.dispose()
            instance.entity.remove_entity(id)
          },
          set_low_priority(priority) {
            instance.entity.set_low_priority(id, priority)
          },
          animate(name) {
            if (name === 'IDLE' && current_animation === 'DANCE') return
            if (name !== current_animation) {
              instance.entity.set_animation(id, name)
              current_animation = name
            }
          },
          position: current_position,
          target_position: null,
        }
      },
      /** @type {(param: {id: string, name: string, skin: string}) => Type.ThreeEntity} */
      get_non_instanced({ id, name, skin }) {
        const { model, compute_animations } = clone_model()
        const { mixer, actions } = compute_animations()

        const origin = new Group()
        const title = new Text()

        title.fontSize = 0.2
        title.color = 'white'
        title.anchorX = 'center'
        title.outlineWidth = 0.02
        title.material = create_billboard_material(
          new MeshBasicMaterial(),
          false,
        )
        title.text = name
        title.layers.set(CartoonRenderpass.non_outlined_layer)

        origin.add(title)
        origin.add(model)

        title.position.y += height
        model.position.y -= height * 0.5

        scene.add(origin)

        let current_animation = actions.IDLE

        current_animation?.play()

        return {
          id,
          title,
          height,
          radius,
          skin,
          mixer,
          object3d: origin,
          jump_time: 0,
          audio: null,
          action: 'IDLE',
          apply_state() {
            throw new Error('Not implemented')
          },
          move(position) {
            origin.position.copy(position)
            origin.position.y = position.y + offset_y
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
          remove() {
            scene.remove(origin)
            dispose(origin)
          },
          animate(name) {
            const animation = actions[name]
            if (animation && animation !== current_animation) {
              fade_to_animation(current_animation, animation)
              current_animation = animation
            }
          },
          position: origin.position,
          target_position: null,
        }
      },
    }
  }

  function character_factory(
    /** @type Type.CharacterName */ character_model_name,
    { height, radius, name, offset_y = 0 },
  ) {
    const model = MODELS[character_model_name]
    if (!model) {
      throw new Error(`Unknown character model "${character_model_name}".`)
    }
    const model_factory = instanciate(model, { height, radius, name, offset_y })

    function find_head_bone(/** @type Object3D */ object3d) {
      let /** @type Bone | null */ head_bone = null
      object3d.traverse((/** @type Bone */ child) => {
        if (child.isBone && child.name.includes('Head')) {
          head_bone = child
        }
      })

      if (!head_bone) {
        throw new Error(
          `Cannot find head bone on character "${character_model_name}".`,
        )
      }
      return head_bone
    }

    function set_bones_visibility(
      /** @type Object3D */ object3d,
      /** @type boolean */ visible,
    ) {
      object3d.traverse((/** @type Bone */ child) => {
        if (child.isBone) {
          child.visible = visible
        }
      })
    }

    return {
      dispose: () => {
        model_factory.instanced_entity.dispose()
      },

      instanciate: ({ id, name, skin }) => {
        const base = model_factory.get_non_instanced({ id, name, skin })

        const head_bone = find_head_bone(base.object3d)

        const /** @type Type.PlayerModel */ result = Object.assign(base, {
            set_head_gear: (/** @type string */ gear_name) => {
              head_bone.clear()

              const gear_model = gear_head_models_store.get_model(
                gear_name,
                character_model_name,
              )
              head_bone.add(gear_model)
              set_bones_visibility(base.object3d, true)
            },

            remove_head_gear: () => {
              head_bone.clear()
              set_bones_visibility(base.object3d, false)
            },
          })

        return result
      },

      instanced_entity: model_factory.instanced_entity,
    }
  }

  const instances = {
    iop_male: character_factory('iop_male', {
      height: 1.7,
      radius: 0.9,
      name: 'iop_male',
    }),
    iop_female: character_factory('iop_female', {
      height: 1.7,
      radius: 0.9,
      name: 'iop_female',
    }),
    sram_male: character_factory('sram_male', {
      height: 1.7,
      radius: 0.9,
      name: 'sram_male',
    }),
    sram_female: character_factory('sram_female', {
      height: 1.7,
      radius: 0.9,
      name: 'sram_female',
    }),
    chafer: character_factory('chafer', {
      height: 2.1,
      radius: 0.9,
      name: 'chafer',
    }),
    suifren_capy: instanciate(MODELS.suifren_capy, {
      height: 0.9,
      radius: 0.9,
      name: 'suifren_capy',
      offset_y: -0.5,
    }),
    sui_bullshark: instanciate(MODELS.suifren_bullshark, {
      height: 0.9,
      radius: 0.9,
      name: 'suifren_bullshark',
      offset_y: -0.5,
    }),
    afegg: instanciate(MODELS.afegg, {
      height: 0.9,
      radius: 0.9,
      name: 'afegg',
      offset_y: -0.52,
    }),
    primemachin: instanciate(MODELS.primemachin, {
      height: 1.8,
      radius: 0.9,
      name: 'primemachin',
    }),
  }

  return {
    dispose() {
      instances.iop_male.instanced_entity.dispose()
      instances.iop_female.instanced_entity.dispose()
      instances.sram_male.instanced_entity.dispose()
      instances.iop_female.instanced_entity.dispose()

      instances.chafer.instanced_entity.dispose()
      instances.suifren_capy.instanced_entity.dispose()
      instances.afegg.instanced_entity.dispose()
      instances.primemachin.instanced_entity.dispose()
    },
    /** @param {Type.SuiCharacter & { skin?: string }} character */
    entity({ id, name, classe, sex = 'male', skin = null }) {
      const target_skin = skin ?? `${classe.toLowerCase()}_${sex}`
      const target_entity = instances[target_skin] ?? instances.chafer

      return {
        instanced: () => target_entity.get({ id, name, skin: target_skin }),
        non_instanced: () =>
          target_entity.get_non_instanced({ id, name, skin: target_skin }),
        instanciate_character: /** @type {() => Type.PlayerModel} */ () =>
          target_entity.instanciate({ id, name, skin: target_skin }),
      }
    },
    ...instances,
  }
}
