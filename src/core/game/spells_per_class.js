import senshi_spell_1 from '../../assets/spells/senshi/jump.jpg'
import senshi_spell_2 from '../../assets/spells/senshi/rage.jpg'
import senshi_spell_3 from '../../assets/spells/senshi/slash.jpg'
import yajin_spell_1 from '../../assets/spells/yajin/flying_soul.jpg'
import yajin_spell_2 from '../../assets/spells/yajin/trap.jpg'
import yajin_spell_3 from '../../assets/spells/yajin/unfazed.jpg'

/** @type {(class_name: string) => Type.Spell[]} */
export function get_spells(class_name) {
  if (class_name === 'senshi')
    return [
      { name: 'Jump', icon: senshi_spell_1 },
      { name: 'Rage', icon: senshi_spell_2 },
      { name: 'Slash', icon: senshi_spell_3 },
    ]
  if (class_name === 'yajin')
    return [
      { name: 'Flying Soul', icon: yajin_spell_1 },
      { name: 'Trap', icon: yajin_spell_2 },
      { name: 'Unfazed', icon: yajin_spell_3 },
    ]
  return []
}
