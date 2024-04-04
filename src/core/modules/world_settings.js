import { BlockType } from '@aresrpg/aresrpg-world'

export const block_types_mapping = height => {
  if (height < 75) return BlockType.WATER
  else if (height < 80) return BlockType.SAND
  else if (height < 125) return BlockType.GRASS
  else if (height < 175) return BlockType.ROCK
  return BlockType.SNOW
}

export const block_types_color_mapping = {
  [BlockType.NONE]: 0x000000,
  [BlockType.ROCK]: 0xababab,
  [BlockType.GRASS]: 0x41980a,
  [BlockType.SNOW]: 0xe5e5e5,
  [BlockType.WATER]: 0x74ccf4,
  [BlockType.SAND]: 0xc2b280,
}
