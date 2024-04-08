import { setInterval } from 'timers/promises'

import {
  BackSide,
  BoxGeometry,
  Color,
  CubeTextureLoader,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three'
import { smoothstep } from 'three/src/math/MathUtils'
import { aiter } from 'iterator-helper'

import { abortable } from '../utils/iterator.js'
import night_nx from '../../assets/skybox/night_nx.png'
import night_ny from '../../assets/skybox/night_ny.png'
import night_nz from '../../assets/skybox/night_nz.png'
import night_px from '../../assets/skybox/night_px.png'
import night_py from '../../assets/skybox/night_py.png'
import night_pz from '../../assets/skybox/night_pz.png'

/** @type {Type.Module} */
export default function () {
  return {
    observe({ scene, events, signal, dispatch }) {
      const day_duration_in_seconds = 2000 // duration of a complete day/night cycle
      const day_autoupdate_delay_in_milliseconds = 500 // delay between updates
      const day_autoupdate_step =
        day_autoupdate_delay_in_milliseconds / (1000 * day_duration_in_seconds)

      let day_autoupdate_paused = false
      let day_time = 0 // in [0, 1]

      const night_texture = new CubeTextureLoader().load([
        night_px,
        night_nx,
        night_py,
        night_ny,
        night_pz,
        night_nz,
      ])

      const material = new ShaderMaterial({
        name: 'skybox_shader',
        uniforms: {
          uSunDirection: { value: new Vector3() },
          uSunSize: { value: 0.0005 },
          uSunGlowSize: { value: 0.001 },
          uSunColor: { value: new Color() },
          uNightTexture: { value: night_texture },
          uNightRotation: { value: new Matrix4() },
        },
        vertexShader: `
        varying vec3 vRayDirection;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          gl_Position.z = gl_Position.w; // set z to camera.far

          vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
          vRayDirection = worldPosition.xyz;
        }`,
        fragmentShader: `
        uniform vec3 uSunDirection; // normalized
        uniform float uSunSize;
        uniform vec3 uSunColor;
        uniform float uSunGlowSize;
        uniform mat4 uNightRotation;
        uniform samplerCube uNightTexture;

        varying vec3 vRayDirection;

        vec3 getSky(const vec3 rayDirection, const vec3 sunDirection) {
          float horizon = (1.0 - smoothstep(0.0, 0.75, rayDirection.y));

          const vec3 baseSkyColor = vec3(0.2,0.4,0.8);
          float skyIllumination = smoothstep(-0.2, 0.1, sunDirection.y);
          vec3 skyColor = baseSkyColor * skyIllumination;
          vec3 nightRayDirection = (uNightRotation * vec4(rayDirection, 0)).xyz;
          vec3 nightSkyColor = textureCube(uNightTexture, nightRayDirection).rgb;
          skyColor = mix(nightSkyColor, skyColor, skyIllumination);

          float horizonGlow = 1.0 - smoothstep(-0.25, 0.5, rayDirection.y);
          float facingSun = 0.501 + 0.5 * dot(normalize(rayDirection.xz), normalize(sunDirection.xz));
          float isSunset = min(1.0 - smoothstep(0.0, 0.2, sunDirection.y), smoothstep(-0.3, -0.2, sunDirection.y));
          horizonGlow *= mix(1.0, pow(facingSun, 16.0), isSunset);

          return mix(skyColor, uSunColor, 0.25 * horizonGlow);
        }

        vec3 getSun(const vec3 rayDirection, const vec3 sunDirection) {
          float angle = 1.0 - clamp(dot(rayDirection, sunDirection), 0.0, 1.0);
          float sun = 10.0 * step(angle, uSunSize);

          float glow = 0.1 * pow(1.0 - angle, 20.0) +
                       0.8 * pow(1.0 - angle, 300.0);

          return uSunColor * (sun + glow);
        }

        void main() {
          vec3 rayDirection = normalize(vRayDirection);
          vec3 sunDirection = uSunDirection;

          vec3 color = getSky(rayDirection, sunDirection) + getSun(rayDirection, sunDirection);
          gl_FragColor = vec4(color, 1);
        }`,
        side: BackSide,
        depthWrite: false,
      })

      const skybox_mesh = new Mesh(new BoxGeometry(1, 1, 1), material)
      skybox_mesh.scale.setScalar(450000)
      scene.add(skybox_mesh)

      const update_sun_size = (/** @type {number} */ value) => {
        material.uniforms.uSunSize.value = value
        material.uniforms.uSunGlowSize.value = 10 * value
      }

      const sun_colors = [
        { color: new Color('#FFFAFC'), threshold: 0.2 },
        { color: new Color('#FF991A'), threshold: 0.0 },
        { color: new Color('#173480'), threshold: -0.3 },
      ]
      const night_rotation_axis = new Vector3(0.2, 0.4, 0.3).normalize()

      const moon_color = new Color(0x777777)
      const ambient_color_day = new Color(0xffffff)
      const ambient_color_night = new Color(0xccccff)

      function compute_sun_color(sun_position) {
        let sun_color = sun_colors[sun_colors.length - 1].color
        for (let i = 1; i < sun_colors.length; i++) {
          const curr_color = sun_colors[i]
          const prev_color = sun_colors[i - 1]

          if (sun_position.y >= curr_color.threshold) {
            sun_color = new Color().lerpColors(
              curr_color.color,
              prev_color.color,
              smoothstep(
                sun_position.y,
                curr_color.threshold,
                prev_color.threshold,
              ),
            )
            break
          }
        }
        return sun_color
      }

      let sky_lights_version = 0
      function update_sky() {
        const sun_position = new Vector3().setFromSphericalCoords(
          1,
          0.00001 + 1.99999 * Math.PI * day_time,
          0.1,
        )
        material.uniforms.uSunDirection.value = sun_position

        const sun_color = compute_sun_color(sun_position)
        const is_day = smoothstep(sun_position.y, -0.3, 0.0)
        // const sun_color = sun_color_raw.lerp(sun_color_raw, is_day)
        material.uniforms.uSunColor.value = sun_color

        material.uniforms.uNightRotation.value = new Matrix4().makeRotationAxis(
          night_rotation_axis,
          Math.PI * day_time,
        )

        sky_lights_version = (sky_lights_version + 1) % 1000

        const fog_color = new Color().lerpColors(
          new Color(0x61455),
          new Color(0xa1bdeb),
          smoothstep(sun_position.y, -0.12, 0.15),
        )
        fog_color.lerpColors(
          new Color(0xffab71),
          fog_color,
          smoothstep(Math.abs(sun_position.y - 0.0), 0, 0.15),
        )

        const sky_lights = {
          version: sky_lights_version,
          fog: {
            color: fog_color,
          },
          directional: {
            position:
              sun_position.y >= 0
                ? sun_position.clone()
                : sun_position.clone().multiplyScalar(-1),
            color: new Color().lerpColors(
              moon_color,
              sun_color,
              smoothstep(sun_position.y, -0.1, 1.0),
            ),
            intensity: smoothstep(Math.abs(sun_position.y), -0.1, 0.05),
          },
          ambient: {
            color: new Color().lerpColors(
              ambient_color_night,
              ambient_color_day,
              is_day,
            ),
            intensity: 0.5 + is_day,
          },
        }

        dispatch('action/sky_lights_change', sky_lights)
      }

      /**
       * @param {number} value
       */
      function set_day_time(value) {
        day_time = value % 1
        update_sky()
      }

      function update_day_time() {
        if (!day_autoupdate_paused) {
          set_day_time(day_time + day_autoupdate_step)
          events.emit('SKY_CYCLE_CHANGED', { value: day_time, fromUi: false })
        }
      }

      events.on('SKY_CYCLE_PAUSED', (/** @type {boolean} */ paused) => {
        day_autoupdate_paused = paused
      })

      events.on('SKY_CYCLE_CHANGED', ({ value, fromUi }) => {
        if (fromUi) {
          set_day_time(value)
        }
      })

      events.on('SKY_SUNSIZE_CHANGED', update_sun_size)

      events.once('STATE_UPDATED', state => {
        day_autoupdate_paused = state.settings.sky.paused
        set_day_time(state.settings.sky.value)
        update_sun_size(state.settings.sky.sun_size)
      })

      aiter(
        abortable(
          setInterval(day_autoupdate_delay_in_milliseconds, null, { signal }),
        ),
      ).forEach(update_day_time)
    },
    reduce(state, { type, payload }) {
      if (type === 'action/sky_lights_change') {
        return {
          ...state,
          settings: {
            ...state.settings,
            sky: {
              ...state.sky,
              lights: payload,
            },
          },
        }
      }
      return state
    },
  }
}
