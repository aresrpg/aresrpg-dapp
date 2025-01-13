import {
  Audio,
  AudioListener,
  AudioLoader,
  PositionalAudio,
  Vector3,
} from 'three'

import step1 from '../../assets/sound/step1.ogg'
import step2 from '../../assets/sound/step2.ogg'
import step3 from '../../assets/sound/step3.ogg'
import step4 from '../../assets/sound/step4.ogg'
import step5 from '../../assets/sound/step5.ogg'
import step6 from '../../assets/sound/step6.ogg'
import { current_three_character } from '../game/game.js'

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

const audio_buffer = import('../../assets/sound/plaine_caffres.mp3')
  .then(module => module.default)
  .then(main_theme => audio_loader.loadAsync(main_theme))
  .then(buffer => {
    main_audio.setBuffer(buffer)
    main_audio.setLoop(true)
    main_audio.setVolume(1)
  })

/** @type {Type.Module} */
export default function () {
  return {
    observe({ events, signal, get_state, camera, scene }) {
      camera.add(listener)

      events.once('STATE_UPDATED', () => {
        const main_audio_autoplay = window.location.hostname !== 'localhost'
        if (main_audio_autoplay) {
          audio_buffer.then(() => {
            if (!signal.aborted) main_audio.play()
          })
        }
        const audio_interval = setInterval(() => {
          main_audio.context.resume()
          if (main_audio.context.state === 'running') {
            clearInterval(audio_interval)
          }
        }, 500)
      })

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
