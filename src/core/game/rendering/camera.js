import CameraControls from 'camera-controls'
import {
  Group,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

/* eslint-disable accessor-pairs */

class GameCamera {
  #camera_perspective
  #camera_children

  camera_controls

  constructor(/** @type WebGLRenderer */ renderer) {
    const fov = 70
    const aspect_ratio = window.innerWidth / window.innerHeight
    const near = 0.1
    const far = 3000

    this.#camera_perspective = new PerspectiveCamera(
      fov,
      aspect_ratio,
      near,
      far,
    )
    this.#camera_perspective.layers.enableAll()

    this.#camera_children = new Group()
    this.#camera_perspective.add(this.#camera_children)

    // @ts-ignore
    this.camera_controls = new CameraControls(
      this.#camera_perspective,
      renderer.domElement,
    )
  }

  set aspect_ratio(/** @type number */ value) {
    this.#camera_perspective.aspect = value
    this.#camera_perspective.updateProjectionMatrix()
  }

  get position() {
    return this.#camera_perspective.getWorldPosition(new Vector3())
  }

  get forward() {
    return new Vector3(0, 0, -1)
      .applyQuaternion(this.#camera_perspective.quaternion)
      .setY(0)
      .normalize()
  }

  get right() {
    return new Vector3(1, 0, 0)
      .applyQuaternion(this.#camera_perspective.quaternion)
      .setY(0)
      .normalize()
  }

  get far() {
    return this.#camera_perspective.far
  }

  get three_camera() {
    return this.#camera_perspective
  }

  add(/** @type Object3D */ object) {
    this.#camera_children.add(object)
  }

  switch_to_isometric() {
    console.log('SWITCH TO ISOMETRIC')

    // Set constraints to maintain isometric-like view
    this.camera_controls.maxPolarAngle = Math.PI / 4 // Limit vertical rotation
    this.camera_controls.minPolarAngle = Math.PI / 4 // Limit vertical rotation
    this.camera_controls.maxAzimuthAngle = Infinity // Allow full horizontal rotation
    this.camera_controls.minAzimuthAngle = -Infinity // Allow full horizontal rotation
    this.camera_controls.enableDamping = true // Enable smooth camera movement
    this.camera_controls.dampingFactor = 0.05 // Adjust damping factor as needed
  }

  switch_to_perspective() {
    // context.camera = camera
    // context.camera_controls.camera = camera
    // // Reset constraints for free movement in perspective view
    // context.camera_controls.maxPolarAngle = Math.PI // Allow full vertical rotation
    // context.camera_controls.minPolarAngle = 0 // Allow full vertical rotation
    // context.camera_controls.maxAzimuthAngle = Infinity // Allow full horizontal rotation
    // context.camera_controls.minAzimuthAngle = -Infinity // Allow full horizontal rotation
  }

  get view_projection_matrix() {
    return new Matrix4()
      .identity()
      .multiplyMatrices(
        this.#camera_perspective.projectionMatrix,
        this.#camera_perspective.matrixWorldInverse,
      )
  }

  set_raycaster(
    /** @type Raycaster */ out_mouse_raycaster,
    /** @type Vector2 */ coords,
  ) {
    out_mouse_raycaster.setFromCamera(coords, this.#camera_perspective)
    return out_mouse_raycaster
  }
}

export { GameCamera }
