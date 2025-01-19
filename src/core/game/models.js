import assert from 'assert'

import senshi_female_hair from '../../assets/models/characters/senshi_female_hair.glb?url'
import senshi_female from '../../assets/models/characters/senshi_female.glb?url'
import senshi_male_hair from '../../assets/models/characters/senshi_male_hair.glb?url'
import senshi_male from '../../assets/models/characters/senshi_male.glb?url'
import yajin_female_hair from '../../assets/models/characters/yajin_female_hair.glb?url'
import yajin_female from '../../assets/models/characters/yajin_female.glb?url'
import yajin_male_hair from '../../assets/models/characters/yajin_male_hair.glb?url'
import yajin_male from '../../assets/models/characters/yajin_male.glb?url'
import anima from '../../assets/models/equipment/anima.glb?url'
import fud from '../../assets/models/equipment/fud.glb?url'
import mokan from '../../assets/models/equipment/mokan.glb?url'
import primemachin from '../../assets/models/equipment/primemachin.glb?url'
import suicunio from '../../assets/models/equipment/suicunio.glb?url'
import fight_sword from '../../assets/models/misc/fight_sword.glb?url'
import araknomath from '../../assets/models/mobs/araknomath.glb?url'
import bouftou from '../../assets/models/mobs/bouftou.glb?url'
import hophop from '../../assets/models/mobs/hophop.glb?url'
import moka from '../../assets/models/mobs/moka.glb?url'
import moyumi from '../../assets/models/mobs/moyumi.glb?url'
import corbac from '../../assets/models/pets/corbac.glb?url'
import krinan from '../../assets/models/pets/krinan.glb?url'
import mosho from '../../assets/models/pets/mosho.glb?url'
import oeuftermath from '../../assets/models/pets/oeuftermath.glb?url'
import siluri from '../../assets/models/pets/siluri.glb?url'
import suicune from '../../assets/models/pets/suicune.glb?url'
import suifren_bullshark from '../../assets/models/pets/suifren_bullshark.glb?url'
import suifren_capy from '../../assets/models/pets/suifren_capy.glb?url'
import talokan from '../../assets/models/pets/talokan.glb?url'
import vaporeon from '../../assets/models/pets/vaporeon.glb?url'
import yago from '../../assets/models/pets/yago.glb?url'
import { load } from '../utils/three/load_model.js'

const AVAILABLE_MODELS = {
  senshi_male_hair,
  senshi_male,
  senshi_female_hair,
  senshi_female,
  yajin_female_hair,
  yajin_female,
  yajin_male_hair,
  yajin_male,

  anima,
  fud,
  mokan,
  primemachin,
  suicunio,

  fight_sword,

  araknomath,
  bouftou,
  hophop,
  moka,
  moyumi,

  corbac,
  krinan,
  mosho,
  oeuftermath,
  siluri,
  suicune,
  suifren_bullshark,
  suifren_capy,
  talokan,
  vaporeon,
  yago,
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
