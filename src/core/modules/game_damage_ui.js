import { MathUtils } from 'three'

import { create_billboard_text } from '../game/rendering/billboard_text.js'
import { current_three_character } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  const critical = {
    text_size: 4,
    fadein: {
      duration: 200,
    },
  }

  const text_particles_list = []

  return {
    tick() {
      const now = performance.now()

      for (let i = text_particles_list.length - 1; i >= 0; i--) {
        const text_particle = text_particles_list[i]
        const age = now - text_particle.birth_timestamp

        let is_expired = false
        let scale = 1
        if (text_particle.is_critical) {
          const top_size = 4
          const fadein_duration = 100
          const topsize_duration = 750
          const fadeout_duration = 200

          if (age < fadein_duration) {
            const phase_progress = age / fadein_duration
            scale = MathUtils.lerp(3 * top_size, top_size, phase_progress)
          } else if (age < fadein_duration + topsize_duration) {
            scale = top_size
          } else if (
            age <
            fadein_duration + topsize_duration + fadeout_duration
          ) {
            const phase_progress =
              (age - (fadein_duration + topsize_duration)) / fadeout_duration
            scale = top_size * (1 - phase_progress)
          } else {
            is_expired = true
          }
        } else {
          const top_size = 2
          const fadein_duration = 150
          const topsize_duration = 300
          const fadeout_duration = 750

          if (age < fadein_duration) {
            const phase_progress = age / fadein_duration
            scale = phase_progress * top_size
          } else if (age < fadein_duration + topsize_duration) {
            scale = top_size
          } else if (
            age <
            fadein_duration + topsize_duration + fadeout_duration
          ) {
            const phase_progress =
              (age - (fadein_duration + topsize_duration)) / fadeout_duration
            scale = top_size * (1 - phase_progress)
            text_particle.text_object.position.y =
              text_particle.origin.y + 2 * phase_progress
          } else {
            is_expired = true
          }
        }

        if (is_expired) {
          if (text_particle.text_object.parent) {
            text_particle.text_object.parent.remove(text_particle.text_object)
            text_particle.text_object.dispose()
          }
          text_particles_list.splice(i, 1)
        } else {
          text_particle.text_object.scale.set(scale, scale, scale)
        }
      }
    },

    observe({ events, get_state, signal, scene }) {
      events.on(
        'DISPLAY_DAMAGE_UI',
        ({ target_object, text, color, is_critical }) => {
          const text_object = create_billboard_text()
          text_object.fontSize = 0.2
          text_object.fontWeight = 'bold'
          text_object.color = color // "#0AD300"//'#E9DA18'
          text_object.anchorX = 'center'
          text_object.anchorY = 'middle'
          text_object.outlineWidth = 0.005
          text_object.text = text
          text_object.position.set(
            target_object.x + 2 * (Math.random() - 0.5),
            target_object.y + Math.random(),
            target_object.z + 2 * (Math.random() - 0.5),
          )

          const text_particle = {
            text_object,
            origin: text_object.position.clone(),
            birth_timestamp: -1,
            is_critical,
          }
          text_object.sync(() => {
            text_particle.birth_timestamp = performance.now()
            text_particles_list.push(text_particle)
            scene.add(text_object)
          })
        },
      )

      window.addEventListener('keyup', event => {
        if (event.code === 'KeyQ') {
          const player = current_three_character(get_state())

          const value = Math.floor(200 * (Math.random() - 0.5))
          const text = value < 0 ? value : `+${value}`
          const color = value < 0 ? '#E9DA18' : '#0AD300'
          const target_object = {
            x: player.position.x,
            y: player.position.y + 1,
            z: player.position.z,
          }
          const is_critical = Math.abs(value) > 50

          events.emit('DISPLAY_DAMAGE_UI', {
            target_object,
            text,
            color,
            is_critical,
          })
        }
      })
    },
  }
}
