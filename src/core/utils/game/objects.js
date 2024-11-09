import gsap from 'gsap'

import { MODELS } from '../../game/models.js'
import dispose from '../three/dispose.js'

import { get_fight_position } from './fight.js'

export async function spawn_crescent_sword(fight, scene) {
  const { model } = await MODELS.crescent_sword

  const { x, y, z } = get_fight_position(fight)
  const fight_timeout = fight.start_time + 60000
  let time_left = fight_timeout - Date.now()

  // Clamp time_left to ensure it doesn't go below 0
  time_left = Math.max(0, time_left)

  // Calculate the target height based on the time left
  const initial_height = y + 10
  const intermediate_height = y + 2.5
  const final_height = y + 0.2
  const target_height =
    intermediate_height -
    ((60000 - time_left) / 60000) * (intermediate_height - final_height)

  model.position.set(x, initial_height, z) // Initial high position
  model.scale.set(0.1, 0.1, 0.1) // Start with a small scale
  model.rotation.x = Math.PI // Rotate 180 degrees around the x-axis

  scene.add(model)

  // Create a GSAP timeline for the animation
  const tl = gsap.timeline()

  // Animation: sword appears in the sky, rotating and growing in size
  tl.to(model.scale, {
    x: 2.5,
    y: 2.5,
    z: 2.5,
    duration: 0.5,
    ease: 'power2.out',
  })

  // Initial drop to the intermediate height
  tl.to(model.position, {
    y: target_height,
    duration: 1.5,
    ease: 'expo.in',
  })

  tl.to(
    model.rotation,
    {
      y: model.rotation.y + Math.PI * 2,
      duration: 1.5,
      ease: 'elastic.out',
      onUpdate: () => {
        model.rotation.x += Math.random() * 0.02 - 0.01 // Slight inclination during the first rotation
        model.rotation.z += Math.random() * 0.02 - 0.01 // Slight inclination during the first rotation
      },
    },
    '<',
  ) // Align with the previous animation

  // Slow downward movement according to time left
  tl.to(model.position, {
    y: final_height,
    duration: time_left / 1000, // Convert milliseconds to seconds
    ease: 'linear',
  })

  return () => {
    scene.remove(model)
    dispose(model)
  }
}
