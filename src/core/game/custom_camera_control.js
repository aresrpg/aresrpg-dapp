// @ts-nocheck
import { VoxelmapCollisions } from '@aresrpg/aresrpg-engine'
import CameraControls from 'camera-controls'
import { Matrix4, PerspectiveCamera, Ray, Vector3 } from 'three'

// Adapted from https://yomotsu.github.io/camera-controls/examples/collision-custom.html

class CustomCameraControls extends CameraControls {
  #ORIGIN = new Vector3(0, 0, 0)
  #v3A = new Vector3()
  #v3B = new Vector3()
  #v3C = new Vector3()
  #ray = new Ray()
  #rotationMatrix = new Matrix4()

  constructor(
    /** @type PerspectiveCamera */ camera,
    /** @type HTMLElement */ dom_element,
    /** @type VoxelmapCollisions */ voxelmap_collisions,
  ) {
    super(camera, dom_element)
    this.voxelmap_collisions = voxelmap_collisions
  }

  _collisionTest() {
    // overriden from CameraControls
    let distance = Infinity

    if (!this.voxelmap_collisions) {
      return distance
    }

    const direction = this.#v3A
      .setFromSpherical(this._spherical)
      .divideScalar(this._spherical.radius)
    this.#rotationMatrix.lookAt(this.#ORIGIN, direction, this._camera.up)

    for (let i = 0; i < 4; i++) {
      const near_plane_corner = this.#v3B.copy(this._nearPlaneCorners[i])
      near_plane_corner.applyMatrix4(this.#rotationMatrix)

      const origin = this.#v3C.addVectors(this._target, near_plane_corner)
      this.#ray.set(origin, direction)

      const from = origin
      const to = origin.clone().addScaledVector(direction, this.maxDistance)

      const intersection = this.voxelmap_collisions.rayCast(from, to)
      if (intersection && intersection.distance < distance) {
        distance = intersection.distance // eslint-disable-line
      }
    }

    return distance
  }
}

export { CustomCameraControls }
