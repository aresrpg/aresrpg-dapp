import iop_spell_1 from '../../assets/spells/iop/jump.jpg'
import iop_spell_2 from '../../assets/spells/iop/rage.jpg'
import iop_spell_3 from '../../assets/spells/iop/slash.jpg'
import sram_spell_1 from '../../assets/spells/sram/flying_soul.jpg'
import sram_spell_2 from '../../assets/spells/sram/trap.jpg'
import sram_spell_3 from '../../assets/spells/sram/unfazed.jpg'

/** @type {(class_name: string) => Type.Spell[]} */
export function get_spells(class_name) {
  if (class_name === 'iop')
    return [
      { name: 'Jump', icon: iop_spell_1 },
      { name: 'Rage', icon: iop_spell_2 },
      { name: 'Slash', icon: iop_spell_3 },
    ]
  if (class_name === 'sram')
    return [
      { name: 'Flying Soul', icon: sram_spell_1 },
      { name: 'Trap', icon: sram_spell_2 },
      { name: 'Unfazed', icon: sram_spell_3 },
    ]
  return []
}
