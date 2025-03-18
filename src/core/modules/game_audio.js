import { setInterval as set_interval } from 'timers/promises'

import {
  Audio,
  AudioListener,
  AudioLoader,
  PositionalAudio,
  Vector3,
} from 'three'
import { aiter } from 'iterator-helper'
import { Biome } from '@aresrpg/aresrpg-world'

import step1 from '../../assets/sound/step1.ogg'
import step2 from '../../assets/sound/step2.ogg'
import step3 from '../../assets/sound/step3.ogg'
import step4 from '../../assets/sound/step4.ogg'
import step5 from '../../assets/sound/step5.ogg'
import step6 from '../../assets/sound/step6.ogg'
import { context, current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'

const listener = new AudioListener()
const main_audio = new Audio(listener)
const step_audio = new Audio(listener)

step_audio.setLoop(false)
step_audio.setVolume(0.7)
step_audio.duration = 0.3

const audio_loader = new AudioLoader()
const random_element = arr => arr[Math.floor(Math.random() * arr.length)]

// Load all step sounds
const step_sounds = [step1, step2, step3, step4, step5, step6]
const step_audio_buffers = []

// Load and store buffers for all step sounds
Promise.all(step_sounds.map(sound => audio_loader.loadAsync(sound)))
  .then(buffers => step_audio_buffers.push(...buffers))
  .catch(error => {
    console.error('Error loading step sounds:', error)
  })

export function play_step_sound() {
  if (step_audio_buffers.length && !step_audio.isPlaying) {
    step_audio.setBuffer(random_element(step_audio_buffers))
    step_audio.play()
  }
}

const biomes_soundtracks = {
  arctic: {
    calm: () => import('../../assets/sound/arctic.mp3'),
    battle: () => import('../../assets/sound/arctic_battle.mp3'),
  },
  glacier: {
    calm: () => import('../../assets/sound/glacier.mp3'),
    battle: () => import('../../assets/sound/glacier_battle.mp3'),
  },
  taiga: {
    calm: () => import('../../assets/sound/taiga.mp3'),
    battle: () => import('../../assets/sound/taiga_battle.mp3'),
  },
  temperate: {
    calm: () => import('../../assets/sound/temperate.mp3'),
    battle: () => import('../../assets/sound/temperate_battle.mp3'),
  },
  grassland: {
    calm: () => import('../../assets/sound/grassland.mp3'),
    battle: () => import('../../assets/sound/grassland_battle.mp3'),
  },
  swamp: {
    calm: () => import('../../assets/sound/swamp.mp3'),
    battle: () => import('../../assets/sound/swamp_battle.mp3'),
  },
  scorched: {
    calm: () => import('../../assets/sound/scorched.mp3'),
    battle: () => import('../../assets/sound/scorched_battle.mp3'),
  },
  desert: {
    calm: () => import('../../assets/sound/desert.mp3'),
    battle: () => import('../../assets/sound/desert_battle.mp3'),
  },
  tropical: {
    calm: () => import('../../assets/sound/tropical.mp3'),
    battle: () => import('../../assets/sound/tropical_battle.mp3'),
  },
}

let current_buffer = null

async function load_biome_theme(biome) {
  if (!biome || !biomes_soundtracks[biome]?.calm) return null

  try {
    const module = await biomes_soundtracks[biome].calm()
    return await audio_loader.loadAsync(module.default)
  } catch (error) {
    console.error(`Failed to load theme for biome ${biome}:`, error)
    return null
  }
}

async function transition_to_biome_theme(biome) {
  const new_buffer = await load_biome_theme(biome)
  if (!new_buffer || new_buffer === current_buffer) return

  // Store the new buffer
  current_buffer = new_buffer

  // If audio context is suspended, we'll wait for the resume
  if (main_audio.context.state === 'suspended') {
    main_audio.setBuffer(new_buffer)
    main_audio.setLoop(true)
    main_audio.setVolume(1)
    return
  }

  // Fade out current theme if playing
  if (main_audio.isPlaying) {
    const original_volume = main_audio.getVolume()
    for (let i = 10; i >= 0; i--) {
      main_audio.setVolume((i / 10) * original_volume)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    main_audio.stop()
  }

  // Set up and play new theme
  main_audio.setBuffer(new_buffer)
  main_audio.setLoop(true)
  main_audio.setVolume(1)
  main_audio.play()
}

/** @type {Type.Module} */
export default function () {
  return {
    observe({ events, signal, get_state, camera, scene }) {
      camera.add(listener)

      events.once('STATE_UPDATED', () => {
        const audio_interval = setInterval(() => {
          main_audio.context.resume()
          if (main_audio.context.state === 'running') {
            clearInterval(audio_interval)
          }
        }, 500)
      })

      aiter(abortable(set_interval(5000, null, { signal }))).reduce(
        async last_biome => {
          const position = current_three_character()?.position

          if (position) {
            const biome = context.world.biome.getBiomeType(position)
            if (
              biome !== last_biome &&
              main_audio.context.state === 'running'
            ) {
              await transition_to_biome_theme(biome)
              return biome
            }
          }

          return last_biome
        },
      )

      events.on('packet/characterPosition', ({ id, position }) => {
        const state = get_state()
        const { visible_characters } = state
        const player_position = current_three_character(state)?.position

        // entities only contains other entities, not the player
        const other_character = visible_characters.get(id)
        const { x, y, z } = position
        if (player_position && other_character) {
          const distance = player_position.distanceTo(new Vector3(x, y, z))

          if (distance < 40) {
            if (!other_character.audio) {
              other_character.audio = new PositionalAudio(listener)
              scene.add(other_character.audio)
              other_character.audio.setLoop(false)
              other_character.audio.setRefDistance(1)
              other_character.audio.setVolume(3)
              other_character.audio.duration = 0.3
            }

            other_character.audio.position.set(x, y, z)

            if (step_audio_buffers.length && !other_character.audio.isPlaying) {
              // Choose a random step sound
              other_character.audio.setBuffer(
                random_element(step_audio_buffers),
              )
              other_character.audio.play() // Play the sound
            }
          }
        }
      })

      signal.addEventListener('abort', () => {
        camera.remove(listener)
        main_audio.stop()
      })
    },
  }
}
