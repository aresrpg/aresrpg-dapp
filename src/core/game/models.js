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
import cape_fuwa from '../../assets/models/equipment/cape_fuwa.glb?url'
import cape_lorito from '../../assets/models/equipment/cape_lorito.glb?url'
import capuche_bara from '../../assets/models/equipment/capuche_bara.glb?url'
import capuche_mo from '../../assets/models/equipment/capuche_mo.glb?url'
import casque_hayate from '../../assets/models/equipment/casque_hayate.glb?url'
import coiffe_fuwa from '../../assets/models/equipment/coiffe_fuwa.glb?url'
import corbac_head from '../../assets/models/equipment/corbac_head.glb?url'
import fud from '../../assets/models/equipment/fud.glb?url'
import hop_hat from '../../assets/models/equipment/hop_hat.glb?url'
import mokan from '../../assets/models/equipment/mokan.glb?url'
import momaku from '../../assets/models/equipment/momaku.glb?url'
import oeufterhead from '../../assets/models/equipment/oeufterhead.glb?url'
import parrot_hat from '../../assets/models/equipment/parrot_hat.glb?url'
import primemachin from '../../assets/models/equipment/primemachin.glb?url'
import sam from '../../assets/models/equipment/sam.glb?url'
import solomonk from '../../assets/models/equipment/solomonk.glb?url'
import suicunio from '../../assets/models/equipment/suicunio.glb?url'
import fight_sword from '../../assets/models/misc/fight_sword.glb?url'
import aragne from '../../assets/models/mobs/aragne.glb?url'
import araknomath from '../../assets/models/mobs/araknomath.glb?url'
import fuwa from '../../assets/models/mobs/fuwa.glb?url'
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
import ghost from '../../assets/models/characters/ghost.glb?url'
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
  ghost,

  anima,
  cape_fuwa,
  cape_lorito,
  capuche_bara,
  capuche_mo,
  casque_hayate,
  coiffe_fuwa,
  corbac_head,
  fud,
  hop_hat,
  mokan,
  momaku,
  oeufterhead,
  parrot_hat,
  primemachin,
  sam,
  solomonk,
  suicunio,

  fight_sword,

  aragne,
  araknomath,
  fuwa,
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
      if (!model_url) {
        console.warn(`Model ${prop.toString()} not found`)
        return null
      }
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

/** @type {(origin: Type.Object3D, name: string) => Type.Object3D} */
export function find_bone(origin, name) {
  let bone = null
  origin.traverse(child => {
    // @ts-ignore
    if (child.isBone && child.name.toLowerCase().includes(name.toLowerCase()))
      bone = child
  })

  assert(bone, `${name} bone not found`)

  return bone
}
