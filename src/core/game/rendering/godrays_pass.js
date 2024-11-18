import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  NoBlending,
  PerspectiveCamera,
  RawShaderMaterial,
  ShaderMaterial,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'

class GodraysPass extends Pass {
  light_direction
  light_size
  light_color

  max_intensity
  exposure
  samplesCount
  density

  camera

  #camera
  #fullscreen_quad
  #skybox_mesh
  #material_sun
  #material_mask
  #material_blur
  #material_composition

  #rendertarget1
  #rendertarget2

  constructor(/** @type PerspectiveCamera */ camera) {
    super()

    this.camera = camera

    this.light_direction = new Vector3(0, 1, 0)
    this.light_size = 0.005
    this.light_color = new Color(0xffffff)

    this.max_intensity = 0.2
    this.exposure = 0.1
    this.samplesCount = 100
    this.density = 0.1

    this.#camera = new PerspectiveCamera()
    this.needsSwap = true

    this.#rendertarget1 = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    })

    this.#rendertarget2 = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    })

    this.#material_sun = new ShaderMaterial({
      uniforms: {
        uLightDirection: { value: this.light_direction },
        uLightSize: { value: this.light_size },
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
      uniform vec3 uLightDirection; // normalized
      uniform float uLightSize;

      varying vec3 vRayDirection;

      vec3 getSun(const vec3 rayDirection, const vec3 sunDirection) {
        float angle = 1.0 - clamp(dot(rayDirection, sunDirection), 0.0, 1.0);
        return step(angle, uLightSize) * vec3(1.0);
      }

      void main() {
        vec3 rayDirection = normalize(vRayDirection);
        vec3 sunDirection = uLightDirection;

        vec3 color = getSun(rayDirection, sunDirection);
        gl_FragColor = vec4(color, 1);
      }`,
      side: BackSide,
      depthWrite: false,
    })

    this.#skybox_mesh = new Mesh(new BoxGeometry(1, 1, 1), this.#material_sun)
    this.#skybox_mesh.scale.setScalar(450000)

    this.#material_mask = new RawShaderMaterial({
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDepthTexture: { value: null },
        uCameraNear: { value: 0 },
        uCameraFar: { value: 0 },
      },
      vertexShader: `attribute vec2 aCorner;

            varying vec2 vUv;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vUv = 0.5 * aCorner + 0.5;
            }`,
      fragmentShader: `precision mediump float;

            #include <packing>

            uniform sampler2D uDepthTexture;
            uniform float uCameraNear;
            uniform float uCameraFar;

            varying vec2 vUv;

            void main(void) {
                float fragCoordZ = texture2D(uDepthTexture, vUv).x;
                float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
                float orthoZ = viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);

                if (orthoZ > 0.99) {
                  discard;
                }
                gl_FragColor = vec4(0, 0, 0, 1);
            }`,
    })

    this.#material_blur = new RawShaderMaterial({
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uLightTexture: { value: null },
        uLightPositionScreenspace: { value: new Vector2() },
        uAspectRatio: { value: 1 },
        uMaxIntensity: { value: 0.2 },
        uExposure: { value: this.exposure },
        uSamplesCount: { value: this.samplesCount },
        uDensity: { value: this.density },
      },
      vertexShader: `attribute vec2 aCorner;

            varying vec2 vViewportCoords;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vViewportCoords = aCorner;
            }`,
      fragmentShader: `precision mediump float;

            uniform sampler2D uLightTexture;
            uniform float uAspectRatio;

            uniform vec2 uLightPositionScreenspace;
            uniform float uMaxIntensity;
            uniform float uExposure;
            uniform int uSamplesCount;
            uniform float uDensity;

            varying vec2 vViewportCoords;

            float sampleLight(const vec2 uv) {
              if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
                return 0.0;
              }
              return texture2D(uLightTexture, uv).r;
            }

            void main(void) {
                vec2 deltaTextCoord = (vViewportCoords - uLightPositionScreenspace) * uDensity / float(uSamplesCount);
                // deltaTextCoord.x /= uAspectRatio;
                const float decay = 0.97;
                float illuminationDecay = decay;
                vec2 lightSampleCoords = 0.5 + 0.5 * vViewportCoords;
                float light = texture2D(uLightTexture, lightSampleCoords).r;

                for (int i = 0; i < 100; i++) {
                  if (i == uSamplesCount) {
                    break;
                  }
                  lightSampleCoords -= deltaTextCoord;
                  light += sampleLight(lightSampleCoords) * illuminationDecay;
                  illuminationDecay *= decay;
                }
                light = min(light, uMaxIntensity);
                light *= uExposure;

                gl_FragColor = vec4(vec3(light), 1);
            }`,
    })

    this.#material_composition = new RawShaderMaterial({
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uLightTexture: { value: null },
        uTexture: { value: null },
        uLightColor: { value: this.light_color },
      },
      vertexShader: `attribute vec2 aCorner;

            varying vec2 vUv;

            void main(void) {
                gl_Position = vec4(aCorner, 0.0, 1.0);
                vUv = 0.5 + 0.5 * aCorner;
            }`,
      fragmentShader: `precision mediump float;

            uniform sampler2D uLightTexture;
            uniform sampler2D uTexture;
            uniform vec3 uLightColor;
           
            varying vec2 vUv;

            void main(void) {
                vec4 source = texture2D(uTexture, vUv);
                float lights = texture2D(uLightTexture, vUv).r;
                gl_FragColor = source + lights * vec4(uLightColor, 1);
            }`,
    })

    const quad_geometry = new BufferGeometry()
    quad_geometry.setAttribute(
      'aCorner',
      new Float32BufferAttribute([-1, +1, +1, +1, -1, -1, +1, -1], 2),
    )
    quad_geometry.setIndex(new Uint16BufferAttribute([0, 2, 1, 2, 3, 1], 1))
    this.#fullscreen_quad = new Mesh(quad_geometry)
    this.#fullscreen_quad.frustumCulled = false
  }

  setSize(/** @type number */ width, /** @type number */ height) {
    const downscale = 2
    const downscaled_width = Math.ceil(width / downscale)
    const downscaled_height = Math.ceil(height / downscale)
    this.#rendertarget1.setSize(downscaled_width, downscaled_height)
    this.#rendertarget2.setSize(downscaled_width, downscaled_height)
  }

  render(
    /** @type WebGLRenderer */ renderer,
    /** @type WebGLRenderTarget */ write_buffer,
    /** @type WebGLRenderTarget */ read_buffer /*, deltaTime, maskActive */,
  ) {
    const previous_state = {
      rendertarget: renderer.getRenderTarget(),
      autoclear: renderer.autoClear,
      autoclear_color: renderer.autoClearColor,
      autoclear_depth: renderer.autoClearDepth,
    }

    renderer.autoClear = false
    renderer.autoClearColor = false
    renderer.autoClearDepth = false

    const { depthTexture } = read_buffer

    renderer.setRenderTarget(this.#rendertarget1)
    // render the sun
    renderer.clear(true, true)
    this.#material_sun.uniforms.uLightDirection.value = this.light_direction
    this.#material_sun.uniforms.uLightSize.value = this.light_size
    renderer.render(this.#skybox_mesh, this.camera)

    // render the mask (= meshes) read from the depth texture
    this.#material_mask.uniforms.uDepthTexture.value = depthTexture
    this.#material_mask.uniforms.uCameraNear.value = this.camera.near
    this.#material_mask.uniforms.uCameraFar.value = this.camera.far
    this.#fullscreen_quad.material = this.#material_mask
    renderer.render(this.#fullscreen_quad, this.#camera)

    // render the blur
    renderer.setRenderTarget(this.#rendertarget2)
    renderer.clear(true, true)
    const light_position = this.light_direction
      .clone()
      .multiplyScalar(10000000)
      .project(this.camera)
    this.#material_blur.uniforms.uLightPositionScreenspace.value.set(
      light_position.x,
      light_position.y,
    )
    this.#material_blur.uniforms.uLightTexture.value =
      this.#rendertarget1.texture
    this.#material_blur.uniforms.uMaxIntensity.value = this.max_intensity
    this.#material_blur.uniforms.uExposure.value = this.exposure
    this.#material_blur.uniforms.uSamplesCount.value = this.samplesCount
    this.#material_blur.uniforms.uDensity.value = this.density
    this.#material_blur.uniforms.uAspectRatio.value =
      this.#rendertarget2.width / this.#rendertarget2.height
    this.#fullscreen_quad.material = this.#material_blur
    renderer.render(this.#fullscreen_quad, this.#camera)

    // render the composition
    renderer.setRenderTarget(this.renderToScreen ? null : write_buffer)
    renderer.clear(true, true)
    this.#material_composition.uniforms.uLightTexture.value =
      this.#rendertarget2.texture
    this.#material_composition.uniforms.uLightColor.value = this.light_color
    this.#material_composition.uniforms.uTexture.value = read_buffer.texture
    this.#fullscreen_quad.material = this.#material_composition
    renderer.render(this.#fullscreen_quad, this.#camera)

    renderer.setRenderTarget(previous_state.rendertarget)
    renderer.autoClear = previous_state.autoclear
    renderer.autoClearColor = previous_state.autoclear_color
    renderer.autoClearDepth = previous_state.autoclear_depth
  }

  dispose() {
    this.#fullscreen_quad.geometry.dispose()
    this.#material_composition.dispose()
  }
}

export { GodraysPass }
