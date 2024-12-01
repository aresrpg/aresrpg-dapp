import {
  HalfFloatType,
  MultiplyBlending,
  NoBlending,
  NormalBlending,
  PerspectiveCamera,
  RawShaderMaterial,
  Scene,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'

import { create_fullscreen_quad } from './utils.js'

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

class VolumetricFogRenderpass extends Pass {
  #camera
  #fullscreen_quad
  #material_fog
  #material_composition
  #rendertarget

  constructor(/** @type PerspectiveCamera */ camera) {
    super()

    this.time = 0
    this.camera = camera

    this.#camera = new PerspectiveCamera()

    this.#rendertarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    })

    this.needsSwap = true

    this.#material_fog = new RawShaderMaterial({
      glslVersion: '300 es',
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDepthTexture: { value: null },
        uCameraNear: { value: 0 },
        uCameraFar: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `in vec2 aCorner;

            out vec2 vUv;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vUv = 0.5 * aCorner + 0.5;
            }`,
      fragmentShader: `precision mediump float;

            #include <packing>

            uniform sampler2D uDepthTexture;
            uniform float uCameraNear;
            uniform float uCameraFar;
            uniform float uTime;

            in vec2 vUv;
            out vec4 fragColor;

            ${noise}

            float readDepth(const vec2 uv) {
                float fragCoordZ = texture(uDepthTexture, uv).x;
                float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
                float orthoZ = viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);
                return orthoZ;
            }

            void main(void) {
                float fragDepthNormalized = readDepth(vUv);
                float fragDepthWorld = fragDepthNormalized * uCameraFar;

                float distance = mix(1.0, 100.0, 0.5 + 0.5 * noise(vec3(10.0 * vUv, 0.5 * uTime)));
                float fog = fragDepthWorld / distance;

                fragColor = vec4(vec3(1), fog);
            }`,
    })

    this.#material_composition = new RawShaderMaterial({
      glslVersion: '300 es',
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uColorTexture: { value: null },
        uFogTexture: { value: this.#rendertarget.texture },
      },
      vertexShader: `in vec2 aCorner;

            out vec2 vUv;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vUv = 0.5 * aCorner + 0.5;
            }`,
      fragmentShader: `precision mediump float;

            uniform sampler2D uColorTexture;
            uniform sampler2D uFogTexture;

            in vec2 vUv;
            out vec4 fragColor;

            void main(void) {
                vec4 color = texture(uColorTexture, vUv);
                vec4 fog = texture(uFogTexture, vUv);
                fragColor = vec4(
                    mix(color.rgb, fog.rgb, fog.a),
                    color.a
                );
            }`,
    })

    this.#fullscreen_quad = create_fullscreen_quad()
  }

  setSize(/** @type number */ width, /** @type number */ height) {
    this.#rendertarget.setSize(width, height)
  }

  render(
    /** @type WebGLRenderer */ renderer,
    /** @type WebGLRenderTarget */ write_buffer,
    /** @type WebGLRenderTarget */ read_buffer /* deltaTime, maskActive */,
  ) {
    const previous_state = {
      rendertarget: renderer.getRenderTarget(),
      camera_mask: this.camera.layers.mask,
      autoclear: renderer.autoClear,
      autoclear_color: renderer.autoClearColor,
      autoclear_depth: renderer.autoClearDepth,
    }

    renderer.autoClear = false
    renderer.autoClearColor = false
    renderer.autoClearDepth = false

    this.time = performance.now() / 1000

    renderer.setRenderTarget(this.#rendertarget)
    this.#material_fog.uniforms.uDepthTexture.value = read_buffer.depthTexture
    this.#material_fog.uniforms.uCameraNear.value = this.camera.near
    this.#material_fog.uniforms.uCameraFar.value = this.camera.far
    this.#material_fog.uniforms.uTime.value = this.time
    this.#fullscreen_quad.material = this.#material_fog
    renderer.render(this.#fullscreen_quad, this.#camera)

    renderer.setRenderTarget(write_buffer)
    this.#material_composition.uniforms.uColorTexture.value =
      read_buffer.texture
    this.#fullscreen_quad.material = this.#material_composition
    renderer.render(this.#fullscreen_quad, this.#camera)

    renderer.autoClear = previous_state.autoclear
    renderer.autoClearColor = previous_state.autoclear_color
    renderer.autoClearDepth = previous_state.autoclear_depth
    renderer.setRenderTarget(previous_state.rendertarget)
  }

  dispose() {
    this.#rendertarget.dispose()
    this.#material_fog.dispose()
    this.#material_composition.dispose()
    this.#fullscreen_quad.geometry.dispose()
  }
}

export { VolumetricFogRenderpass }
