import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items'

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
      Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)),
    ),
  )
}

const equipments = [
  ITEM_CATEGORY.AMULET,
  ITEM_CATEGORY.AXE,
  ITEM_CATEGORY.BELT,
  ITEM_CATEGORY.BOOTS,
  ITEM_CATEGORY.BOW,
  ITEM_CATEGORY.CLOACK,
  ITEM_CATEGORY.DAGGER,
  ITEM_CATEGORY.FISHING_ROD,
  ITEM_CATEGORY.HAMMER,
  ITEM_CATEGORY.HAT,
  ITEM_CATEGORY.MOUNT,
  ITEM_CATEGORY.PICKAXE,
  ITEM_CATEGORY.RELIC,
  ITEM_CATEGORY.RING,
  ITEM_CATEGORY.SCYTHE,
  ITEM_CATEGORY.SHOVEL,
  ITEM_CATEGORY.STAFF,
  ITEM_CATEGORY.SWORD,
  ITEM_CATEGORY.WAND,
]

const consumable = [ITEM_CATEGORY.CONSUMABLE, ITEM_CATEGORY.RUNE]

export function is_equipment(item) {
  return equipments.includes(item.item_category)
}

export function is_consumable(item) {
  return consumable.includes(item.item_category)
}

export function is_resource(item) {
  return item.item_category === ITEM_CATEGORY.MISC
}
