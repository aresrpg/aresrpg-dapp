export function get_player_skin(sui_character) {
  if (sui_character.title?.item_type === 'primemachin') return 'primemachin'
  if (sui_character.title?.item_type === 'anima') return 'anima'
}
