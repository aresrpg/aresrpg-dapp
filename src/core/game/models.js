import assert from 'assert'

import { Matrix4, Vector3 } from 'three'

import senshi_male from '../../assets/models/characters/senshi_male.glb?url'
import senshi_male_hair from '../../assets/models/equipment/senshi_male_hair.glb?url'
import senshi_female from '../../assets/models/characters/senshi_female.glb?url'
import senshi_female_hair from '../../assets/models/equipment/senshi_female_hair.glb?url'
import yajin_male from '../../assets/models/characters/yajin_male.glb?url'
import yajin_male_hair from '../../assets/models/equipment/yajin_male_hair.glb?url'
import yajin_female from '../../assets/models/characters/yajin_female.glb?url'
import yajin_female_hair from '../../assets/models/equipment/yajin_female_hair.glb?url'
import primemachin from '../../assets/models/characters/primemachin.glb?url'
import primemachin_hair from '../../assets/models/equipment/primemachin_hair.glb?url'
import anima from '../../assets/models/characters/anima.glb?url'
import anima_hair from '../../assets/models/equipment/anima_hair.glb?url'
import suifren_bullshark from '../../assets/models/pets/suifren_bullshark.glb?url'
import suifren_capy from '../../assets/models/pets/suifren_capy.glb?url'
import afegg from '../../assets/models/pets/afegg.glb?url'
import vaporeon from '../../assets/models/pets/vaporeon.glb?url'
import suicune from '../../assets/models/pets/suicune.glb?url'
import suicune_hat from '../../assets/models/equipment/suicune_hat.glb?url'
import chafer from '../../assets/models/mobs/chafer.glb?url'
import hop_bunny from '../../assets/models/mobs/hop_bunny.glb?url'
import pirate_parrot from '../../assets/models/pets/pirate_parrot.glb?url'
import crescent_sword from '../../assets/models/equipment/crescent_sword.glb?url'
import { load } from '../utils/three/load_model.js'

const AVAILABLE_MODELS = {
  senshi_male,
  senshi_male_hair,
  senshi_female,
  senshi_female_hair,
  yajin_male,
  yajin_male_hair,
  yajin_female,
  yajin_female_hair,

  primemachin,
  primemachin_hair,
  anima,
  anima_hair,

  chafer,
  hop_bunny,

  suifren_bullshark,
  suifren_capy,
  afegg,
  vaporeon,
  suicune,
  pirate_parrot,

  suicunio: suicune_hat,
  crescent_sword,
}

const loaded_models = new Map()

/**
 * @type {Readonly<{[K in keyof typeof AVAILABLE_MODELS]: Promise<ReturnType<Awaited<ReturnType<typeof load>>>>}>}
 */
export const MODELS = new Proxy(/** @type {any} */ ({}), {
  get(_, prop) {
    if (!loaded_models.has(prop)) {
      const model_url = AVAILABLE_MODELS[prop]
      loaded_models.set(
        prop,
        load(model_url).catch(error =>
          console.error('Failed to load model', prop, error),
        ),
      )
    }

    return loaded_models.get(prop).then(clone_model => clone_model())
  },
})

/** @type {(origin: Type.Object3D) => Type.Object3D} */
export function find_head_bone(origin) {
  let head_bone = null
  origin.traverse(child => {
    // @ts-ignore
    if (child.isBone && child.name.includes('Head')) head_bone = child
  })

  assert(head_bone, 'Head bone not found')

  return head_bone
}
