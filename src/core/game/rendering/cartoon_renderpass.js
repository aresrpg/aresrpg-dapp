import {
  HalfFloatType,
  MultiplyBlending,
  NoBlending,
  PerspectiveCamera,
  RawShaderMaterial,
  Scene,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'

import { create_fullscreen_quad } from './utils.js'

class CartoonRenderpass extends Pass {
  static non_outlined_layer = 1

  #rendertarget
  #fullscreen_quad
  #outline_material
  #copy_material

  constructor(/** @type Scene */ scene, /** @type PerspectiveCamera */ camera) {
    super()

    this.scene = scene
    this.camera = camera
    this.enable_thick_lines = false

    this.needsSwap = false

    this.#rendertarget = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
    })

    this.#outline_material = new RawShaderMaterial({
      glslVersion: '300 es',
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDepthTexture: { value: null },
        uTexelSize: { value: new Vector2(1, 1) },
        uCameraNear: { value: 0 },
        uCameraFar: { value: 0 },
        uThickLines: { value: 0 },
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
            uniform vec2 uTexelSize;
            uniform float uCameraNear;
            uniform float uCameraFar;
            uniform uint uThickLines;

            in vec2 vUv;
            out vec4 fragColor;

            float readDepth(const vec2 shift) {
                vec2 coords = vUv + shift * uTexelSize * 0.5;
                float fragCoordZ = texture(uDepthTexture, coords).x;
                float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
                float orthoZ = viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);
                return pow(orthoZ, 0.1);
            }

            float computeSobel_3(const float fragDepth) {
                float depths[9] = float[](
                    readDepth(vec2(-1,-1)),
                    readDepth(vec2(-1,+0)),
                    readDepth(vec2(-1,+1)),
                    readDepth(vec2(+0,-1)),
                    fragDepth,
                    readDepth(vec2(+0,+1)),
                    readDepth(vec2(+1,-1)),
                    readDepth(vec2(+1,+0)),
                    readDepth(vec2(+1,+1))
                );

                // kernel definition (in glsl matrices are filled in column-major order)
                const float Gx[9] = float[](
                    -1.0, -2.0, -1.0,
                     0.0,  0.0,  0.0,
                     1.0,  2.0,  1.0
                );
                const float Gy[9] = float[](
                    -1.0, 0.0, 1.0,
                    -2.0, 0.0, 2.0,
                    -1.0, 0.0, 1.0
                );

                float valueGx = 0.0;
                float valueGy = 0.0;

                for (uint i = 0u; i < 9u; i++) {
                    valueGx += Gx[i] * depths[i];
                    valueGy += Gy[i] * depths[i];
                }

                // magnitude of the total gradient
                return (valueGx * valueGx) + (valueGy * valueGy) * 6.0;
            }

            float computeSobel_5(const float fragDepth) {
                float depths[25] = float[](
                    readDepth(vec2(-2,-2)),
                    readDepth(vec2(-2,-1)),
                    readDepth(vec2(-2,+0)),
                    readDepth(vec2(-2,+1)),
                    readDepth(vec2(-2,+2)),

                    readDepth(vec2(-1,-2)),
                    readDepth(vec2(-1,-1)),
                    readDepth(vec2(-1,+0)),
                    readDepth(vec2(-1,+1)),
                    readDepth(vec2(-1,+2)),

                    readDepth(vec2(+0,-2)),
                    readDepth(vec2(+0,-1)),
                    fragDepth,
                    readDepth(vec2(+0,+1)),
                    readDepth(vec2(+0,+2)),

                    readDepth(vec2(+1,-2)),
                    readDepth(vec2(+1,-1)),
                    readDepth(vec2(+1,+0)),
                    readDepth(vec2(+1,+1)),
                    readDepth(vec2(+1,+2)),

                    readDepth(vec2(+2,-2)),
                    readDepth(vec2(+2,-1)),
                    readDepth(vec2(+2,+0)),
                    readDepth(vec2(+2,+1)),
                    readDepth(vec2(+2,+2))
                );

                // kernel definition (in glsl matrices are filled in column-major order)
                const float Gx[25] = float[](
                     2.0,  2.0,  4.0,  2.0,  2.0,
                     1.0,  1.0,  2.0,  1.0,  1.0,
                     0.0,  0.0,  0.0,  0.0,  0.0,
                    -2.0, -2.0, -4.0, -2.0, -2.0,
                    -1.0, -1.0, -2.0, -1.0, -1.0
                );
                const float Gy[25] = float[](
                     2.0,  1.0,  0.0, -1.0, -2.0,
                     2.0,  1.0,  0.0, -1.0, -2.0,
                     4.0,  2.0,  0.0, -2.0, -4.0,
                     2.0,  1.0,  0.0, -1.0, -2.0,
                     2.0,  1.0,  0.0, -1.0, -2.0
                );

                float valueGx = 0.0;
                float valueGy = 0.0;

                for (uint i = 0u; i < 25u; i++) {
                    valueGx += Gx[i] * depths[i];
                    valueGy += Gy[i] * depths[i];
                }

                // magnitude of the total gradient
                return (valueGx * valueGx) + (valueGy * valueGy) / 25.0 * 3.0;
            }

            float computeOutline(float fragDepth) {
                float sobel;
                if (uThickLines == 1u) {
                  sobel = computeSobel_5(fragDepth);
                } else {
                  sobel = computeSobel_3(fragDepth);
                }
                sobel = abs(sobel);
                sobel = min(0.5, sobel);

                const float maxDepth = 0.75;
                fragDepth /= maxDepth;

                float strength = clamp(1.0 - fragDepth, 0.0, 1.0);

                float f = clamp(1.0 - pow(fragDepth, 2.0), 0.0, 1.0);
                float factor = mix(2000.0, 0.0, f);
                return 1.0 - clamp(strength * factor * sobel, 0.0, 1.0);
            }

            void main(void) {
                float fragDepth = readDepth(vec2(0));
                float outline = computeOutline(fragDepth);
                fragColor = vec4(vec3(outline), 1);
            }`,
    })

    this.#copy_material = new RawShaderMaterial({
      glslVersion: '300 es',
      blending: MultiplyBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTexture: { value: this.#rendertarget.texture },
      },
      vertexShader: `in vec2 aCorner;

            out vec2 vUv;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vUv = 0.5 * aCorner + 0.5;
            }`,
      fragmentShader: `precision mediump float;

            uniform sampler2D uTexture;

            in vec2 vUv;
            out vec4 fragColor;

            void main(void) {
                fragColor = texture(uTexture, vUv);
            }`,
    })

    this.#fullscreen_quad = create_fullscreen_quad()
    this.#fullscreen_quad.material = this.#outline_material
  }

  setSize(/** @type number */ width, /** @type number */ height) {
    this.#outline_material.uniforms.uTexelSize.value = new Vector2(
      1 / width,
      1 / height,
    )
    this.#rendertarget.setSize(width, height)
  }

  render(
    /** @type WebGLRenderer */ renderer,
    /** @type WebGLRenderTarget */ _write_buffer,
    /** @type WebGLRenderTarget */ read_buffer /*, deltaTime, maskActive */,
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

    if (this.renderToScreen) {
      throw new Error('Render to screen not supported')
    }
    renderer.setRenderTarget(read_buffer)
    renderer.clear(true, true, renderer.autoClearStencil)

    // draw geometry that will be outlined
    this.camera.layers.enableAll()
    this.camera.layers.disable(CartoonRenderpass.non_outlined_layer)
    renderer.render(this.scene, this.camera)

    // extract outlines
    this.#outline_material.uniforms.uDepthTexture.value =
      read_buffer.depthTexture
    this.#outline_material.uniforms.uCameraNear.value = this.camera.near
    this.#outline_material.uniforms.uCameraFar.value = this.camera.far
    this.#outline_material.uniforms.uThickLines.value = +this.enable_thick_lines
    this.#fullscreen_quad.material = this.#outline_material

    this.camera.layers.enableAll()
    renderer.setRenderTarget(this.#rendertarget)
    renderer.render(this.#fullscreen_quad, this.camera)

    // add outlines
    this.#fullscreen_quad.material = this.#copy_material
    renderer.setRenderTarget(read_buffer)
    renderer.render(this.#fullscreen_quad, this.camera)

    // draw the rest of the geometry
    this.camera.layers.set(CartoonRenderpass.non_outlined_layer)
    renderer.render(this.scene, this.camera)

    this.camera.layers.mask = previous_state.camera_mask
    renderer.autoClear = previous_state.autoclear
    renderer.autoClearColor = previous_state.autoclear_color
    renderer.autoClearDepth = previous_state.autoclear_depth
    renderer.setRenderTarget(previous_state.rendertarget)
  }

  dispose() {
    this.#fullscreen_quad.geometry.dispose()
    this.#outline_material.dispose()
    this.#copy_material.dispose()
  }
}

export { CartoonRenderpass }
