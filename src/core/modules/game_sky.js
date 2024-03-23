import {
  BackSide,
  BoxGeometry,
  Color,
  CubeTextureLoader,
  Mesh,
  SRGBColorSpace,
  ShaderMaterial,
  Spherical,
  Vector3,
} from 'three'
import { smoothstep } from 'three/src/math/MathUtils'

import day_nx from '../../assets/skybox/day_nx.jpg'
import day_ny from '../../assets/skybox/day_ny.jpg'
import day_nz from '../../assets/skybox/day_nz.jpg'
import day_px from '../../assets/skybox/day_px.jpg'
import day_py from '../../assets/skybox/day_py.jpg'
import day_pz from '../../assets/skybox/day_pz.jpg'
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
        uniform vec3 uSunDirection;
        uniform float uSunSize;
        uniform vec3 uSunColor;
        uniform float uSunGlowSize;
        uniform samplerCube uNightTexture;

        varying vec3 vRayDirection;
              
        vec3 getSky(const vec3 rayDirection, const vec3 sunDirection) {
          float horizon = (1.0 - smoothstep(0.0, 0.75, rayDirection.y));

          const vec3 baseSkyColor = vec3(0.2,0.4,0.8);
          float skyIllumination = smoothstep(-0.2, 0.2, sunDirection.y);
          vec3 skyColor = baseSkyColor * skyIllumination;
          vec3 nightSkyColor = textureCube(uNightTexture, rayDirection).rgb;
          skyColor = mix(nightSkyColor, skyColor, skyIllumination);

          float horizonGlow = 1.0 - smoothstep(0.0, 0.2, rayDirection.y);
          float facingSun = 0.5 + 0.5 * dot(normalize(rayDirection.xz), normalize(sunDirection.xz));
          float isSunset = 1.0 - smoothstep(0.0, 0.2, abs(sunDirection.y));
          horizonGlow = mix(horizonGlow, horizonGlow * pow(facingSun, 8.0), isSunset);

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
          vec3 sunDirection = normalize(uSunDirection);
          
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
        { color: new Color('#CC4D4D'), threshold: -0.2 },
        { color: new Color('#173480'), threshold: -0.3 },
      ]

      const updateSunDirection = daytimeCycleValue => {
        const sunDirection = new Vector3().setFromSphericalCoords(
          1,
          2 * Math.PI * daytimeCycleValue,
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

        events.emit('SKY_SUNCOLOR_CHANGED', sunColor.clone())

        sunColor.lerp(sunColor, smoothstep(-0.3, 0.0, sunDirection.y))
        material.uniforms.uSunColor.value = sunColor
      }

      events.on('SKY_CYCLE_CHANGED', ({ value }) => updateSunDirection(value))
      updateSunDirection(get_state().settings.sky.value)
    },
  }
}
