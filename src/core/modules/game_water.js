import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three'

import { abortable } from '../utils/iterator.js'
import { current_character } from '../game/game.js'
import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'

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

const noise_voronoi = `vec2 hash2(vec2 p ) {
  return fract(sin(vec2(dot(p, vec2(123.4, 748.6)), dot(p, vec2(547.3, 659.3))))*5232.85324);   
}
float hash(vec2 p) {
 return fract(sin(dot(p, vec2(43.232, 75.876)))*4526.3257);   
}

//Based off of iq's described here: https://iquilezles.org/articles/voronoilines
float voronoi(vec2 p, float time) {
   vec2 n = floor(p);
   vec2 f = fract(p);
   float md = 5.0;
   vec2 m = vec2(0.0);
   for (int i = -1;i<=1;i++) {
       for (int j = -1;j<=1;j++) {
           vec2 g = vec2(i, j);
           vec2 o = hash2(n+g);
           o = 0.5+0.5*sin(time+5.038*o);
           vec2 r = g + o - f;
           float d = dot(r, r);
           if (d<md) {
             md = d;
             m = n+g+o;
           }
       }
   }
   return md;
}

float ov(vec2 p, float time) {
   float v = 0.0;
   float a = 0.4;
   for (int i = 0;i<3;i++) {
       v+= voronoi(p, time)*a;
       p*=2.0;
       a*=0.5;
   }
   return v;
}`

/** @type {Type.Module} */
export default function () {
  const material = new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uColor: { value: null },
      uF0: { value: 0 },
      uEta: { value: 0 },
      uEnvMap: { value: null },
      uTime: { value: 0 },
      uNormalSide: { value: 1 },
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
      
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      /* Fresnel factor describes the proportion of refracted and reflected.
       * Arguments expected to be normalized. */
      float getFresnelFactor(const vec3 normal, const vec3 fromEye) {
        float rawValue = mix(pow(1.0 - dot(normal, -fromEye), 5.0), 1.0, uF0);
        return pow(rawValue, 0.25);
      }

      ${noise}

      ${noise_voronoi}

      void main(void) {
        const float normalVerticality = 0.1;
        const float normalScale = 1.0;
        vec3 worldNormal = vec3(
          normalVerticality * noise(vec3(normalScale * vWorldPosition.xz, uTime)),
          1,
          normalVerticality * noise(vec3(normalScale * vWorldPosition.zx, uTime))
        );
        worldNormal = uNormalSide * normalize(worldNormal);

        vec3 cameraToFragRaw = vWorldPosition - cameraPosition;
        vec3 cameraToFrag = normalize(cameraToFragRaw);

        const float maxFoamDistance = 700.0;
        float foam = 2.0 * ov(250.0 * vUv, uTime);
        foam *= 1.0 - smoothstep(0.0, maxFoamDistance, length(cameraToFragRaw));
        foam = smoothstep(0.4, 0.9, foam);
        foam = foam * foam;
        foam = clamp(foam, 0.0, 1.0);

        vec3 reflectVec = reflect(cameraToFrag, worldNormal);
        vec3 refractVec = refract(cameraToFrag, worldNormal, uEta);

        vec3 envmapVec = (uNormalSide > 0.0) ? reflectVec : refractVec;
        vec3 envColor = textureCube(uEnvMap, envmapVec).rgb * (1.0 + 1.5 * foam);

        vec3 refractedColor = (uNormalSide > 0.0) ? 0.1 * uColor : envColor;
        vec3 reflectedColor = (uNormalSide > 0.0) ? envColor : 0.1 * uColor;

        float fresnelFactor = getFresnelFactor(worldNormal, cameraToFrag);
        vec3 surfaceColor = mix(refractedColor, reflectedColor, fresnelFactor) + 0.05 * foam;

        gl_FragColor = vec4(surfaceColor, 1);
      }`,
  })

  const base_size = 500
  const base_mesh = new Mesh(new PlaneGeometry(base_size, base_size), material)
  base_mesh.rotateX(Math.PI / 2)
  base_mesh.layers.set(CartoonRenderpass.non_outlined_layer)

  const meshes = []

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
    observe({ scene, get_state }) {
      const container = new Group()
      container.name = 'water'

      for (let d_x = -5; d_x <= 5; d_x++) {
        for (let d_z = -5; d_z <= 5; d_z++) {
          const mesh = base_mesh.clone()
          mesh.position.set(base_size * d_x, 0, base_size * d_z)
          meshes.push(mesh)
          container.add(mesh)
        }
      }

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()

        const water_level = state.settings.water.level + 0.1
        let player_position_x = 0
        let player_position_z = 0

        const player = current_character(state)
        if (player && player.position) {
          player_position_x = player.position.x
          player_position_z = player.position.z
        }

        container.position.set(
          base_size * Math.floor(player_position_x / base_size),
          water_level,
          base_size * Math.floor(player_position_z / base_size),
        )

        material.uniforms.uColor.value = state.settings.water.color
        material.uniforms.uEnvMap.value = scene.environment

        if (!container.parent) {
          scene.add(container)
        }
      })
    },
  }
}
