import {
  EQUIPMENTS,
  WEAPONS,
  CONSUMABLES,
  MISC,
} from '@aresrpg/aresrpg-sdk/items'

export function key_from_item({
  id,
  kiosk_id,
  personal_kiosk_cap_id,
  amount,
  ...rest
}) {
  // return rest and sort keys
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(rest).sort(([a], [b]) => a.localeCompare(b))
    )
  )
}

export function is_equipment(item) {
  return EQUIPMENTS.includes(item.item_category)
}

export function is_weapon(item) {
  return WEAPONS.includes(item.item_category)
}

export function is_consumable(item) {
  return CONSUMABLES.includes(item.item_category)
}

export function is_resource(item) {
  return MISC.includes(item.item_category)
}

export function is_character(item) {
  return item.is_aresrpg_character || item.item_category === 'character'
}
