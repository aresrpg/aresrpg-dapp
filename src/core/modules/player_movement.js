// @ts-ignore
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import {
  // CylinderGeometry,
  Group,
  // Mesh,
  // MeshPhongMaterial,
  Object3D,
  Vector3,
} from 'three'
import { VoxelmapCollisions } from '@aresrpg/aresrpg-engine'

import { context, current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import { get_terrain_height } from '../utils/terrain/chunk_utils.js'
import { sea_level } from '../utils/terrain/world_settings.js'

import { play_step_sound } from './game_audio.js'

const RUN_SPEED = 10
const WALK_SPEED = 6
const SWIM_SPEED = 10
const GRAVITY = 50
const GRAVITY_UNDERWATER = 5
const JUMP_FORCE = 13
const JUMP_FORWARD_IMPULSE = 3
const JUMP_COOLDOWN = 0.1 // one jump every 100ms

function compute_inputs_horizontal_movement(camera, inputs) {
  const inputs_horizontal_movement_camera = new Vector3(
    Number(inputs.right) - Number(inputs.left),
    0,
    Number(inputs.forward || (inputs.mouse_left && inputs.mouse_right)) -
      Number(inputs.backward),
  )
  const has_inputs_horizontal_movement =
    inputs_horizontal_movement_camera.lengthSq() > 0
  if (has_inputs_horizontal_movement) {
    inputs_horizontal_movement_camera.normalize()
  }

  const camera_forward = new Vector3(0, 0, -1)
    .applyQuaternion(camera.quaternion)
    .setY(0)
    .normalize()
  const camera_right = new Vector3(1, 0, 0)
    .applyQuaternion(camera.quaternion)
    .setY(0)
    .normalize()
  const inputs_horizontal_movement_world = new Vector3()
  inputs_horizontal_movement_world.addScaledVector(
    camera_forward,
    inputs_horizontal_movement_camera.z,
  )
  inputs_horizontal_movement_world.addScaledVector(
    camera_right,
    inputs_horizontal_movement_camera.x,
  )
  return inputs_horizontal_movement_world
}

/** @type {Type.Module} */
export default function () {
  const velocity = new Vector3()

  let jump_cooldown = 0
  let current_action = 'IDLE'
  let last_action = 'IDLE'
  let already_cancelled = false

  const dummy = new Object3D()

  const player_collider_object = new Group()
  const player_collider_radius = 0.25
  const player_collider_height = 1.1
  // {
  // const player_collider_mesh = new Mesh(
  //   new CylinderGeometry(
  //     player_collider_radius,
  //     player_collider_radius,
  //     player_collider_height,
  //   ),
  //   new MeshPhongMaterial({ color: 0xcccccc }),
  // )
  // player_collider_mesh.position.y = 0.5 * player_collider_height
  // player_collider_object.add(player_collider_mesh)
  // }

  return {
    tick(state, { camera, physics }, delta) {
      const player = state.characters.find(
        character => character.id === state.selected_character_id,
      )
      if (!player) return

      const { inputs } = state
      const origin = player.position.clone()
      const is_underwater = player.position.y < sea_level

      if (player.target_position) {
        player.target_position.y = get_terrain_height(
          player.target_position,
          player.height,
        )
        player.move(player.target_position)
        player.target_position = null
        player_collider_object.position.copy(player.position)
        return
      }

      const /** @type VoxelmapCollisions */ { voxelmap_collisions } = physics
      const player_collisions = voxelmap_collisions.entityMovement(
        {
          radius: player_collider_radius,
          height: player_collider_height,
          position: player.position
            .clone()
            .sub({ x: 0, y: 0.5 * player.height, z: 0 }),
          velocity,
        },
        {
          deltaTime: delta,
          gravity: is_underwater ? GRAVITY_UNDERWATER : GRAVITY,
          considerMissingVoxelAs: 'blocking',
        },
      )

      if (player_collisions.computationStatus === 'partial') {
        // some required voxeldata was missing -> abort
        return
      }

      player.position.copy(player_collisions.position).y += 0.5 * player.height
      velocity.copy(player_collisions.velocity)

      // Avoid falling to hell
      // TODO: tp to nether if falling to hell
      if (origin.y <= 10) {
        velocity.setScalar(0)
        player.move(new Vector3(origin.x, 200, origin.z))
        return
      }

      const inputs_horizontal_movement = compute_inputs_horizontal_movement(
        camera,
        inputs,
      )
      const has_inputs_horizontal_movement =
        inputs_horizontal_movement.lengthSq() > 0

      const movement = new Vector3()

      current_action = 'IDLE'

      if (is_underwater) {
        const water_movement = inputs_horizontal_movement
          .clone()
          .multiplyScalar(SWIM_SPEED)
        velocity.x = water_movement.x
        velocity.z = water_movement.z
        player.rotate(water_movement)

        if (inputs.jump) {
          velocity.y = 1.5 * GRAVITY_UNDERWATER
        } else {
          velocity.y = -GRAVITY_UNDERWATER
        }
        current_action = 'RUN'
      } else {
        if (player_collisions.isOnGround) {
          const ground_movement = inputs_horizontal_movement
            .clone()
            .multiplyScalar(inputs.walk ? WALK_SPEED : RUN_SPEED)
          velocity.x = ground_movement.x
          velocity.z = ground_movement.z

          if (has_inputs_horizontal_movement) {
            if (inputs.walk) {
              current_action = 'WALK'
            } else {
              current_action = 'RUN'
            }

            player.rotate(ground_movement)
            play_step_sound()
          }

          // Apply jump force
          if (jump_cooldown > 0) {
            jump_cooldown -= delta
          }
          if (inputs.jump && jump_cooldown <= 0) {
            const forward_impulse = inputs_horizontal_movement
              .clone()
              .multiplyScalar(JUMP_FORWARD_IMPULSE)
            velocity.x += forward_impulse.x
            velocity.y = JUMP_FORCE
            velocity.z += forward_impulse.z

            jump_cooldown = JUMP_COOLDOWN
          }
        } else {
          if (velocity.y > 0) {
            current_action = 'JUMP_RUN'
          } else {
            current_action = 'FALL'
          }
        }
      }

      dummy.position.copy(origin.clone().add(movement))

      const is_moving_horizontally = movement.x !== 0 || movement.z !== 0

      const should_cancel_other_actions =
        is_moving_horizontally &&
        !['RUN', 'WALK', 'JUMP', 'JUMP_RUN', 'FALL'].includes(player.action) &&
        !already_cancelled

      if (current_action !== last_action || should_cancel_other_actions) {
        context.dispatch('action/character_action', {
          id: player.id,
          action: current_action,
        })
        already_cancelled = true
      }

      if (player.action === current_action) already_cancelled = false

      last_action = current_action

      player.animate(player.action)
    },
    reduce(state, { type, payload }) {
      // if the character is mine
      if (
        type === 'packet/characterPosition' &&
        payload.id === state.selected_character_id
      ) {
        const target_character = state.characters.find(
          character => character.id === payload.id,
        )
        // and if it's the current controlled character
        if (target_character)
          target_character.target_position = payload.position
      }
      return state
    },
    observe({ events, signal, dispatch, send_packet, scene }) {
      scene.add(player_collider_object)

      aiter(abortable(setInterval(50, null, { signal }))).reduce(
        last_position => {
          const player = current_three_character()

          if (!player?.position) return last_position

          /** @type {Vector3} */
          // @ts-ignore
          const { position } = player

          // round position with 2 decimals
          const x = Math.round(position.x * 100) / 100
          const y = Math.round(position.y * 100) / 100
          const z = Math.round(position.z * 100) / 100

          if (
            last_position.x !== x ||
            last_position.y !== y ||
            last_position.z !== z
          ) {
            send_packet('packet/characterPosition', {
              id: player.id,
              position: { x, y, z },
            })
          }

          return { x, y, z }
        },
        { x: 0, y: 0, z: 0 },
      )

      // @ts-ignore
      dispatch('') // dispatch meaningless action to trigger the first state change and allow player_spawn.js to register the player
    },
  }
}
