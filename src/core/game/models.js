import assert from 'assert'

import { Matrix4, Vector3 } from 'three'

import iop_male from '../../assets/models/characters/iop_male.glb?url'
import iop_female from '../../assets/models/characters/iop_female.glb?url'
import sram_male from '../../assets/models/characters/sram_male.glb?url'
import sram_female from '../../assets/models/characters/sram_female.glb?url'
import primemachin from '../../assets/models/characters/primemachin.glb?url'
import suifren_bullshark from '../../assets/models/pets/suifren_bullshark.glb?url'
import suifren_capy from '../../assets/models/pets/suifren_capy.glb?url'
import afegg from '../../assets/models/pets/afegg.glb?url'
import vaporeon from '../../assets/models/pets/vaporeon.glb?url'
import suicune from '../../assets/models/pets/suicune.glb?url'
import pug_hat from '../../assets/models/equipment/pug_hat.glb?url'
import suicune_hat from '../../assets/models/equipment/suicune_hat.glb?url'
import chafer from '../../assets/models/mobs/chafer.glb?url'
import hop_bunny from '../../assets/models/mobs/hop_bunny.glb?url'
import pirate_parrot from '../../assets/models/pets/pirate_parrot.glb?url'
import crescent_sword from '../../assets/models/equipment/crescent_sword.glb?url'
import { load } from '../utils/three/load_model.js'

export const MODELS = {
  iop_male: await load(iop_male, {}),
  iop_female: await load(iop_female, {}),
  sram_male: await load(sram_male, {}),
  sram_female: await load(sram_female, {}),

  primemachin: await load(primemachin, {}),

  chafer: await load(chafer, {}),
  hop_bunny: await load(hop_bunny, {}),

  suifren_bullshark: await load(suifren_bullshark),
  suifren_capy: await load(suifren_capy),
  afegg: await load(afegg),
  vaporeon: await load(vaporeon, { env_map_intensity: 1 }),
  suicune: await load(suicune),
  pirate_parrot: await load(pirate_parrot),

  fud_hat: await load(pug_hat, {}),
  suicunio: await load(suicune_hat, {}),
  crescent_sword: await load(crescent_sword, {}),
}

function apply_matrix({ scale = 1, position = [0, 0, 0] }) {
  return model => {
    model.applyMatrix4(new Matrix4().scale(new Vector3(scale, scale, scale)))
    model.applyMatrix4(new Matrix4().setPosition(new Vector3(...position)))
  }
}

export const MATRIX = {
  fud_hat: {
    sram_male: apply_matrix({ scale: 2.8, position: [0, -2.8, 0.05] }),
    sram_female: apply_matrix({ scale: 5600, position: [0, -6800, 200] }),
    iop_male: apply_matrix({ scale: 2.9, position: [0, -2.8, 0.2] }),
    iop_female: apply_matrix({ scale: 250, position: [0, -300, 50] }),
    primemachin: apply_matrix({ scale: 1000, position: [0, -1400, 0] }),
  },
  suicunio: {
    sram_male: apply_matrix({ scale: 2.8, position: [0, -2.8, -0.2] }),
    sram_female: apply_matrix({ scale: 5600, position: [0, -6800, -200] }),
    iop_male: apply_matrix({ scale: 2.9, position: [0, -2.8, 0] }),
    iop_female: apply_matrix({ scale: 250, position: [0, -300, 20] }),
    primemachin: apply_matrix({ scale: 1000, position: [0, -1400, 0] }),
  },
}

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
