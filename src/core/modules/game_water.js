import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  TextureLoader,
} from 'three'
import { world_settings } from '@aresrpg/aresrpg-sdk/world'

import texture_url from '../../assets/water/texture.png?url'
import { current_three_character } from '../game/game.js'
import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { abortable } from '../utils/iterator.js'
import { chunk_size } from '../game/voxel_engine.js'

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
  const texture = new TextureLoader().load(texture_url)
  texture.minFilter = LinearMipMapLinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping

  const material_uniforms = {
    uColorTexture: { value: null },
    uF0: { value: 0 },
    uEta: { value: 0 },
    uEnvMap: { value: null },
    uTime: { value: 0 },
    uNormalSide: { value: 1 },
    uTexture: { value: texture },
  }

  const material = new MeshStandardMaterial({
    transparent: true,
    side: DoubleSide,
  })

  return {
    tick(state, { scene }) {
      material.envMap = scene.environment

      material_uniforms.uTime.value = performance.now() / 1000

      let eta = 0.8
      if (state.settings.camera.is_underwater) {
        material_uniforms.uNormalSide.value = -1
        eta = 1 / eta
      } else {
        material_uniforms.uNormalSide.value = 1
      }
      material_uniforms.uF0.value = Math.pow((1 - eta) / (1 + eta), 2)
      material_uniforms.uEta.value = eta
    },
    observe({ scene, get_state, dispatch, voxel_engine }) {
      const { water_data, set_water_level } = voxel_engine

      const patch_size = chunk_size.xz
      const patches_count = water_data.patchesCount

      function build_geometry() {
        const mesh_size = patch_size * patches_count
        const geometry = new BufferGeometry()
        geometry.setAttribute(
          'position',
          new Float32BufferAttribute(
            [
              0,
              0,
              0,
              mesh_size,
              0,
              0,
              0,
              0,
              mesh_size,
              mesh_size,
              0,
              mesh_size,
            ],
            3,
          ),
        )
        geometry.setAttribute(
          'uv',
          new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2),
        )
        geometry.setIndex([0, 1, 3, 0, 3, 2])
        return geometry
      }

      material.onBeforeCompile = parameters => {
        parameters.uniforms = {
          ...parameters.uniforms,
          ...material_uniforms,
        }

        parameters.vertexShader = parameters.vertexShader.replace(
          'void main() {',
          `
          varying vec2 vUv;
          varying vec3 vWorldPosition;

          void main() {
            vUv = uv;
        `,
        )
        parameters.vertexShader = parameters.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldPosition = worldPosition.xyz;
        `,
        )

        parameters.fragmentShader = parameters.fragmentShader.replace(
          'void main() {',
          `
          uniform sampler2D uColorTexture;
          uniform float uF0;
          uniform float uEta;
          uniform samplerCube uEnvMap;
          uniform float uTime;
          uniform float uNormalSide;
          uniform sampler2D uTexture;

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
            vec2 textureCoords = 4.0 * vUv * ${patches_count.toFixed(1)};
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

          void main() {
        `,
        )
        parameters.fragmentShader = parameters.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          `
          vec3 normal = worldNormal;
          vec3 nonPerturbedNormal = normal;
        `,
        )
        parameters.fragmentShader = parameters.fragmentShader.replace(
          '#include <map_fragment>',
          `
          vec3 cameraToFragRaw = vWorldPosition - cameraPosition;
          float cameraDistance = length(cameraToFragRaw);
          vec3 cameraToFrag = cameraToFragRaw / cameraDistance;
          float isOverwater = step(0.0, uNormalSide);

          vec3 worldNormal = getNormal();
          float fresnelFactor = getFresnelFactor(worldNormal, cameraToFrag);
          fresnelFactor = mix(fresnelFactor, 0.5, smoothstep(300.0, 700.0, cameraDistance));
          vec3 reflectVec = reflect(cameraToFrag, worldNormal);
          vec3 refractVec = refract(cameraToFrag, worldNormal, uEta);

          vec3 envmapVec = mix(refractVec, reflectVec, isOverwater);
          vec3 envColor = textureCube(uEnvMap, envmapVec).rgb;
          float env = max(envColor.r, max(envColor.g, envColor.b));
          env *= smoothstep(0.9, 1.0, env);

          float foam = computeFoam(cameraDistance);
          vec3 waterColor = texture(uColorTexture, vUv).rgb;
          vec3 surfaceColor = clamp(waterColor + foam, vec3(0), vec3(1));
          surfaceColor += env;

          float alpha = mix(0.2, 0.98, pow(fresnelFactor, 0.4));
          alpha = mix(1.0, alpha, isOverwater);
          alpha = clamp(alpha, 0.0, 1.0);

          diffuseColor = vec4(surfaceColor, alpha);
        `,
        )
      }

      material_uniforms.uColorTexture.value = water_data.texture

      const mesh = new Mesh(build_geometry(), material)
      mesh.name = 'water'
      mesh.receiveShadow = true
      mesh.layers.set(CartoonRenderpass.non_outlined_layer)

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()

        set_water_level(world_settings.getSeaLevel() + 0.5)

        let player_position_x = 0
        let player_position_z = 0

        const player = current_three_character(state)
        if (player && player.position) {
          player_position_x = player.position.x
          player_position_z = player.position.z
        }

        const player_patch_id = {
          x: Math.floor(player_position_x / patch_size),
          z: Math.floor(player_position_z / patch_size),
        }
        const water_origin_patch_id = {
          x: player_patch_id.x - Math.floor(patches_count / 2),
          z: player_patch_id.z - Math.floor(patches_count / 2),
        }
        water_data.setWaterOriginPatch({
          x: water_origin_patch_id.x,
          y: water_origin_patch_id.z,
        })
        mesh.position.set(
          water_origin_patch_id.x * patch_size,
          water_data.map.waterLevel,
          water_origin_patch_id.z * patch_size,
        )

        const water_color = water_data.map.getWaterColorForPatch(
          player_patch_id.x,
          player_patch_id.z,
        )
        dispatch('action/water_changed', {
          color: new Color(
            water_color[0] / 255,
            water_color[1] / 255,
            water_color[2] / 255,
          ),
        })

        material_uniforms.uEnvMap.value = scene.environment

        if (!mesh.parent) {
          scene.add(mesh)
        }
      })
    },
    reduce(state, { type, payload }) {
      if (type === 'action/water_changed') {
        return {
          ...state,
          settings: {
            ...state.settings,
            water: payload,
          },
        }
      }
      return state
    },
  }
}
