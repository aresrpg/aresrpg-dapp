import { Matrix4, Object3D, Vector3 } from 'three'

import { load } from '../../utils/three/load_model.js'

import { gear_definitions } from './gear_definitions.js'

class GearModelsStore {
  constructor(
    /** @type Record<String, Type.Gear.Definition> */ gear_definitions,
  ) {
    this.gear_definitions = gear_definitions
    /** @type Record<string, Object3D > */ this.models = {}
  }

  async load() {
    for (const [name, definition] of Object.entries(this.gear_definitions)) {
      const callback = await load(definition.model_url, {
        env_map_intensity: 0.5,
        scale: 1,
      })

      this.models[name] = callback().model
    }
  }

  get_model(
    /** @type string */ name,
    /** @type Type.CharacterName */ character_name,
  ) {
    const model_template = this.models[name]
    if (!model_template) {
      throw new Error(`Unknown gear model ${name}`)
    }

    const transform = this.gear_definitions[name].transforms[character_name]
    if (!transform) {
      throw new Error(
        `No transform for gear model ${name} and character ${character_name}`,
      )
    }

    const model = model_template.clone()

    // TODO could be optimized
    model.applyMatrix4(
      new Matrix4().scale(
        new Vector3(transform.scale, transform.scale, transform.scale),
      ),
    )
    model.applyMatrix4(new Matrix4().makeRotationX(transform.rotation[0]))
    model.applyMatrix4(new Matrix4().makeRotationY(transform.rotation[1]))
    model.applyMatrix4(new Matrix4().makeRotationZ(transform.rotation[2]))
    model.applyMatrix4(new Matrix4().setPosition(0, -600, 300))

    return model
  }
}

const gear_head_models_store = new GearModelsStore(gear_definitions.head)

export { gear_head_models_store }
