import { BlockType } from '@aresrpg/aresrpg-world'

import { BLOCKS } from '../blocks.js'

export default {
  deep_ocean: {
    x: 0,
    y: 0,
    type: BlockType.WATER,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 0,
  },
  hello: {
    x: 0.5,
    y: 0.5,
    type: BLOCKS.GRANIT,
    subtype: BlockType.NONE,
    fadeIn: 0,
    fadeOut: 0,
  },
}
