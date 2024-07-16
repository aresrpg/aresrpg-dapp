import { setInterval } from 'timers/promises'
import { on } from 'events'

import { aiter } from 'iterator-helper'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  RepeatWrapping,
  ShaderMaterial,
  TextureLoader,
} from 'three'

import { abortable } from '../utils/iterator.js'
import { current_character } from '../game/game.js'
import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import texture_url from '../../assets/water/texture.png?url'
import { sea_level } from '../utils/terrain/world_settings.js'

const noise = `//	Simplex 3D Noise
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float noise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 0.2 * 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}`

/** @type {Type.Module} */
export default function () {
  const base_size = 500
  const texture = new TextureLoader().load(texture_url)
  texture.minFilter = LinearMipMapLinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping

  const material = new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    uniforms: {
      uColor: { value: null },
      uF0: { value: 0 },
      uEta: { value: 0 },
      uEnvMap: { value: null },
      uTime: { value: 0 },
      uNormalSide: { value: 1 },
      uTexture: { value: texture },
      uAmbient: { value: new Color(0xffffff) },
    },
    vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main(void) {
        vec4 worldPosition = modelMatrix * vec4(position, 1);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;

        vUv = uv;
        vWorldPosition = worldPosition.xyz;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uF0;
      uniform float uEta;
      uniform samplerCube uEnvMap;
      uniform float uTime;
      uniform float uNormalSide;
      uniform sampler2D uTexture;
      uniform vec3 uAmbient;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

      float getFresnelFactor(const vec3 normal, const vec3 fromEye) {
        float rawValue = mix(pow(1.0 - dot(normal, -fromEye), 5.0), 1.0, uF0);
        rawValue = pow(rawValue, 0.5);
        return rawValue;
      }

      ${noise}

      vec3 getNormal() {
        const float normalVerticality = 0.1;
        const float normalScale = 1.0;

        vec3 worldNormal = vec3(
          normalVerticality * noise(vec3(normalScale * vWorldPosition.xz, uTime)),
          1,
          normalVerticality * noise(vec3(normalScale * vWorldPosition.zx, uTime))
        );
        return uNormalSide * normalize(worldNormal);
      }

      float computeFoam(float cameraDistance) {
        vec2 textureCoords = ${Math.ceil(base_size / 15).toFixed(1)} * vUv;
        textureCoords += 0.2 * vec2(
          noise(vec3(0.1 * vWorldPosition.xz, 0.2 * uTime)),
          noise(vec3(0.1 * vWorldPosition.zx, 0.2 * uTime))
        );
        vec4 textureSample = texture2D(uTexture, textureCoords);

        const float maxFoamDistance = 800.0;
        float distance = smoothstep(0.0, maxFoamDistance, cameraDistance);
        float foam = textureSample.r;
        foam *= 1.0 - distance;
        return foam;
      }

      void main(void) {
        vec3 worldNormal = getNormal();

        vec3 cameraToFragRaw = vWorldPosition - cameraPosition;
        float cameraDistance = length(cameraToFragRaw);
        vec3 cameraToFrag = cameraToFragRaw / cameraDistance;
        float isOverwater = step(0.0, uNormalSide);

        float fresnelFactor = getFresnelFactor(worldNormal, cameraToFrag);
        fresnelFactor = mix(fresnelFactor, 0.5, smoothstep(300.0, 700.0, cameraDistance));
        vec3 reflectVec = reflect(cameraToFrag, worldNormal);
        vec3 refractVec = refract(cameraToFrag, worldNormal, uEta);

        vec3 envmapVec = mix(refractVec, reflectVec, isOverwater);
        vec3 envColor = textureCube(uEnvMap, envmapVec).rgb;
        float env = max(envColor.r, max(envColor.g, envColor.b));
        env *= smoothstep(0.9, 1.0, env);

        float foam = computeFoam(cameraDistance);
        vec3 surfaceColor = clamp(uColor + foam, vec3(0), vec3(1));
        surfaceColor *= uAmbient;
        surfaceColor += env;

        float alpha = mix(0.2, 1.0, fresnelFactor);
        alpha = mix(1.0, alpha, isOverwater);
        gl_FragColor = vec4(surfaceColor, alpha);
      }`,
  })

  return {
    tick(state) {
      material.uniforms.uTime.value = performance.now() / 1000

      let eta = 0.8
      if (state.settings.camera.is_underwater) {
        material.uniforms.uNormalSide.value = -1
        eta = 1 / eta
      } else {
        material.uniforms.uNormalSide.value = 1
      }
      material.uniforms.uF0.value = Math.pow((1 - eta) / (1 + eta), 2)
      material.uniforms.uEta.value = eta
    },
    observe({ scene, get_state, events, signal }) {
      function build_geometry() {
        const position_buffer = []
        const uv_buffer = []
        const index_buffer = []

        const uv_list = [
          { x: 0, z: 0 },
          { x: 1, z: 0 },
          { x: 0, z: 1 },
          { x: 1, z: 1 },
        ]

        let square_index_start = 0
        for (let d_x = -5; d_x <= 5; d_x++) {
          for (let d_z = -5; d_z <= 5; d_z++) {
            for (const uv of uv_list) {
              position_buffer.push(
                base_size * (d_x + uv.x),
                0,
                base_size * (d_z + uv.z),
              )
              uv_buffer.push(uv.x, uv.z)
            }

            index_buffer.push(
              square_index_start + 0,
              square_index_start + 1,
              square_index_start + 2,
            )
            index_buffer.push(
              square_index_start + 1,
              square_index_start + 3,
              square_index_start + 2,
            )
            square_index_start += 4
          }
        }

        const geometry = new BufferGeometry()
        geometry.setAttribute(
          'position',
          new Float32BufferAttribute(position_buffer, 3),
        )
        geometry.setAttribute('uv', new Float32BufferAttribute(uv_buffer, 2))
        geometry.setIndex(index_buffer)
        return geometry
      }

      const mesh = new Mesh(build_geometry(), material)
      mesh.name = 'water'
      mesh.layers.set(CartoonRenderpass.non_outlined_layer)

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        ({ last_sky_lights_version, last_water_color }, [state]) => {
          const lights_changed =
            state.settings.sky.lights.version !== last_sky_lights_version ||
            !last_water_color ||
            !last_water_color.equals(state.settings.water.color)

          if (lights_changed) {
            last_sky_lights_version = state.settings.sky.lights.version
            last_water_color = state.settings.water.color

            material.uniforms.uColor.value = state.settings.water.color
            material.uniforms.uAmbient.value =
              state.settings.sky.lights.ambient.color
                .clone()
                .multiplyScalar(
                  Math.min(1, state.settings.sky.lights.ambient.intensity),
                )
          }

          return {
            last_sky_lights_version,
            last_water_color,
          }
        },
        {
          last_sky_lights_version: 0,
          last_water_color: null,
        },
      )

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()

        const water_level = sea_level + 0.1
        let player_position_x = 0
        let player_position_z = 0

        const player = current_character(state)
        if (player && player.position) {
          player_position_x = player.position.x
          player_position_z = player.position.z
        }

        mesh.position.set(
          base_size * Math.floor(player_position_x / base_size),
          water_level,
          base_size * Math.floor(player_position_z / base_size),
        )

        material.uniforms.uEnvMap.value = scene.environment

        if (!mesh.parent) {
          scene.add(mesh)
        }
      })
    },
  }
}
