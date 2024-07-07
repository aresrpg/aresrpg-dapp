export function get_spawned_entities_count({
  visible_mobs_group,
  visible_characters,
}) {
  let entity_count = 0

  for (const { entities } of visible_mobs_group.values()) {
    entity_count += entities.length
  }

  entity_count += visible_characters.size

  return entity_count
}
