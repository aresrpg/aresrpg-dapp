import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  NoBlending,
  PerspectiveCamera,
  RawShaderMaterial,
  Uint16BufferAttribute,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'

class UnderwaterPass extends Pass {
  #camera
  #fullscreen_quad
  #material

  constructor() {
    super()

    this.#camera = new PerspectiveCamera()
    this.needsSwap = true

    this.color = new Color(0x3f7be2)

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

    this.#material = new RawShaderMaterial({
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTexture: { value: null },
        uColor: { value: this.color },
        uTime: { value: 0 },
        uAspectRatio: { value: 1 },
      },
      vertexShader: `attribute vec2 aCorner;

            varying vec2 vUv;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vUv = 0.5 * aCorner + 0.5;
            }`,
      fragmentShader: `precision mediump float;

            uniform sampler2D uTexture;
            uniform vec3 uColor;
            uniform float uTime;
            uniform float uAspectRatio;

            varying vec2 vUv;

            ${noise}

            void main(void) {
                vec2 uv = vec2(vUv.x * uAspectRatio, vUv.y);

                vec2 dUv = vec2(
                  noise(vec3(3.0 * uv.xy, uTime)),
                  noise(vec3(3.0 * uv.yx, uTime))
                );

                vec2 atCenter = 1.0 - smoothstep(0.35, 0.5, abs(vUv - 0.5));
                float factor = min(atCenter.x, atCenter.y);
                dUv *= factor;
                dUv *= 0.03;

                uv = fract(vUv + dUv);
                uv = clamp(uv, vec2(0), vec2(1));

                gl_FragColor = vec4(uColor, 1) * texture2D(uTexture, uv);
            }`,
    })

    const quad_geometry = new BufferGeometry()
    quad_geometry.setAttribute(
      'aCorner',
      new Float32BufferAttribute([-1, +1, +1, +1, -1, -1, +1, -1], 2),
    )
    quad_geometry.setIndex(new Uint16BufferAttribute([0, 2, 1, 2, 3, 1], 1))
    this.#fullscreen_quad = new Mesh(quad_geometry, this.#material)
    this.#fullscreen_quad.frustumCulled = false
  }

  render(
    /** @type WebGLRenderer */ renderer,
    /** @type WebGLRenderTarget */ write_buffer,
    /** @type WebGLRenderTarget */ read_buffer /*, deltaTime, maskActive */,
  ) {
    const previous_state = {
      rendertarget: renderer.getRenderTarget(),
    }

    renderer.setRenderTarget(this.renderToScreen ? null : write_buffer)
    this.#material.uniforms.uTexture.value = read_buffer.texture
    this.#material.uniforms.uColor.value = this.color
    this.#material.uniforms.uTime.value = performance.now() / 3000
    this.#material.uniforms.uAspectRatio.value =
      read_buffer.width / read_buffer.height
    renderer.render(this.#fullscreen_quad, this.#camera)
    renderer.setRenderTarget(previous_state.rendertarget)
  }

  dispose() {
    this.#fullscreen_quad.geometry.dispose()
    this.#material.dispose()
  }
}

export { UnderwaterPass }
