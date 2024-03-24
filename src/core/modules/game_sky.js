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

import night_nx from '../../assets/skybox/night_nx.png'
import night_ny from '../../assets/skybox/night_ny.png'
import night_nz from '../../assets/skybox/night_nz.png'
import night_px from '../../assets/skybox/night_px.png'
import night_py from '../../assets/skybox/night_py.png'
import night_pz from '../../assets/skybox/night_pz.png'

/** @type {Type.Module} */
export default function () {
  return {
    name: 'game_sky',
    observe({ scene, events, get_state }) {
      const nightTexture = new CubeTextureLoader().load([
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
          uNightTexture: { value: nightTexture },
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

      const skyboxMesh = new Mesh(new BoxGeometry(1, 1, 1), material)
      skyboxMesh.scale.setScalar(450000)
      scene.add(skyboxMesh)

      const updateSunSize = (/** @type {number} */ value) => {
        material.uniforms.uSunSize.value = value
        material.uniforms.uSunGlowSize.value = 10 * value
      }
      events.on('SKY_SUNSIZE_CHANGED', updateSunSize)
      updateSunSize(get_state().settings.sky.sunSize)

      const sunColors = [
        { color: new Color('#FFFAFC'), threshold: 0.2 },
        { color: new Color('#FF991A'), threshold: 0.0 },
        { color: new Color('#173480'), threshold: -0.3 },
      ]
      const nightRotationAxis = new Vector3(0.2, 0.4, 0.3).normalize()
      const moonColor = new Color(0x777777)

      const ambientColorDay = new Color(0xffffff)
      const ambientColorNight = new Color(0xccccff)

      const updateSunDirection = daytimeCycleValue => {
        const sunDirection = new Vector3().setFromSphericalCoords(
          1,
          0.00001 + 1.99999 * Math.PI * daytimeCycleValue,
          0.1,
        )
        material.uniforms.uSunDirection.value = sunDirection

        let sunColor = sunColors[sunColors.length - 1].color
        for (let iC = 1; iC < sunColors.length; iC++) {
          const currColor = sunColors[iC]
          const prevColor = sunColors[iC - 1]

          if (sunDirection.y >= currColor.threshold) {
            sunColor = new Color().lerpColors(
              currColor.color,
              prevColor.color,
              smoothstep(
                sunDirection.y,
                currColor.threshold,
                prevColor.threshold,
              ),
            )
            break
          }
        }

        events.emit('SKY_FOGCOLOR_CHANGED', sunColor.clone())

        const lightDirection =
          sunDirection.y >= 0
            ? sunDirection.clone()
            : sunDirection.clone().multiplyScalar(-1)
        events.emit('SKY_LIGHT_MOVED', lightDirection)
        const lightIntensity =
          1 -
          Math.min(
            smoothstep(sunDirection.y, -0.3, -0.2),
            1 - smoothstep(sunDirection.y, 0, 0.05),
          )

        events.emit('SKY_LIGHT_INTENSITY_CHANGED', lightIntensity)
        const lightColor = new Color().lerpColors(
          moonColor,
          sunColor,
          smoothstep(sunDirection.y, -0.1, 1.0),
        )
        events.emit('SKY_LIGHT_COLOR_CHANGED', lightColor)

        const isDay = smoothstep(sunDirection.y, -0.3, 0.0)
        events.emit('SKY_AMBIENTLIGHT_CHANGED', {
          color: new Color().lerpColors(
            ambientColorNight,
            ambientColorDay,
            isDay,
          ),
          intensity: 0.5 + isDay,
        })

        sunColor.lerp(sunColor, isDay)
        material.uniforms.uSunColor.value = sunColor

        material.uniforms.uNightRotation.value = new Matrix4().makeRotationAxis(
          nightRotationAxis,
          Math.PI * daytimeCycleValue,
        )
      }

      events.on('SKY_CYCLE_CHANGED', ({ value }) => updateSunDirection(value))
      updateSunDirection(get_state().settings.sky.value)
    },
  }
}
