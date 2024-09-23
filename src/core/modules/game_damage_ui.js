import { MathUtils } from "three";
import { create_billboard_text } from "../game/rendering/billboard_text.js";
import { current_three_character } from "../game/game.js";

/** @type {Type.Module} */
export default function () {
  const critical = {
    text_size: 4,
    fadein: {
      duration: 200
    }
  };

  const textParticlesList = []

  return {
    tick({ visible_characters }, __, delta) {
      const now = performance.now()

      for (let iP = textParticlesList.length - 1; iP >= 0; iP--) {
        const textParticle = textParticlesList[iP];
        const age = now - textParticle.birth_timestamp;

        let is_expired = false;
        let scale = 1;
        if (textParticle.is_critical) {
          const top_size = 4;
          const fadein_duration = 100;
          const topsize_duration = 750;
          const fadeout_duration = 200;

          if (age < fadein_duration) {
            const phaseProgress = age / fadein_duration;
            scale = MathUtils.lerp(3 * top_size, top_size, phaseProgress);
          } else if (age < fadein_duration + topsize_duration) {
            scale = top_size;
          } else if (age < fadein_duration + topsize_duration + fadeout_duration) {
            const phaseProgress = (age - (fadein_duration + topsize_duration)) / fadeout_duration;
            scale = top_size * (1 - phaseProgress);
          } else {
            is_expired = true
          }
        } else {
          const top_size = 2;
          const fadein_duration = 150;
          const topsize_duration = 300;
          const fadeout_duration = 750;

          if (age < fadein_duration) {
            const phaseProgress = age / fadein_duration;
            scale = phaseProgress * top_size;
          } else if (age < fadein_duration + topsize_duration) {
            scale = top_size;
          } else if (age < fadein_duration + topsize_duration + fadeout_duration) {
            const phaseProgress = (age - (fadein_duration + topsize_duration)) / fadeout_duration;
            scale = top_size * (1 - phaseProgress);
            textParticle.textObject.position.y = textParticle.origin.y + 2 * phaseProgress
          } else {
            is_expired = true
          }
        }

        if (is_expired) {
          if (textParticle.textObject.parent) {
            textParticle.textObject.parent.remove(textParticle.textObject)
            textParticle.textObject.dispose();
          }
          textParticlesList.splice(iP, 1);
        } else {
          textParticle.textObject.scale.set(scale, scale, scale)
        }
      }
    },

    observe({ events, get_state, signal, scene }) {
      events.on('DISPLAY_DAMAGE_UI', ({ targetObject, text, color, is_critical }) => {
        const textObject = create_billboard_text()
        textObject.fontSize = 0.2
        textObject.fontWeight = "bold"
        textObject.color = color//"#0AD300"//'#E9DA18'
        textObject.anchorX = 'center'
        textObject.anchorY = "middle"
        textObject.outlineWidth = 0.005
        textObject.text = text
        textObject.position.set(
          targetObject.x + 2 * (Math.random() - 0.5),
          targetObject.y + Math.random(),
          targetObject.z + 2 * (Math.random() - 0.5),
        );

        const textParticle = {
          textObject,
          origin: textObject.position.clone(),
          birth_timestamp: -1,
          is_critical,
        };
        textObject.sync(() => {
          textParticle.birth_timestamp = performance.now();
          textParticlesList.push(textParticle);
          scene.add(textObject)
        });
      })

      window.addEventListener("keyup", event => {
        if (event.code === "KeyQ") {
          const player = current_three_character(get_state())

          const value = Math.floor(200 * (Math.random() - 0.5));
          const text = value < 0 ? value : `+${value}`
          const color = value < 0 ? '#E9DA18' : "#0AD300";
          const targetObject = {
            x: player.position.x,
            y: player.position.y + 1,
            z: player.position.z,
          }
          const is_critical = Math.abs(value) > 50;

          events.emit("DISPLAY_DAMAGE_UI", { targetObject, text, color, is_critical });
        }
      });
    },
  }
}
