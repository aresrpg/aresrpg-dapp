import { BLOCKS } from '../blocks.js'

export default {
  abyss: {
    x: 0,
    y: 0,
    type: BLOCKS.COLD_WATER,
    fadeIn: 0,
    fadeOut: 0,
  },
  shore: {
    x: 0.2,
    y: 0.1,
    type: BLOCKS.DARK_ICE,
    subtype: BLOCKS.DARKER_ICE,
    fadeIn: 0,
    fadeOut: 0,
  },
  floe: {
    x: 0.21,
    y: 0.302,
    type: BLOCKS.ICE,
    subtype: BLOCKS.DARK_ICE,
    fadeIn: 0,
    fadeOut: 0,
  },
  land: {
    x: 0.6,
    y: 0.33,
    type: BLOCKS.ICE,
    subtype: BLOCKS.DARK_ICE,
    fadeIn: 0,
    fadeOut: 0,
  },
  cliff: {
    x: 0.65,
    y: 0.5,
    type: BLOCKS.ICE,
    subtype: BLOCKS.DARKER_ICE,
    fadeIn: 0,
    fadeOut: 0,
  },
  slope_down: {
    x: 0.9,
    y: 0.28,
    type: BLOCKS.LIGHT_ICE,
    subtype: BLOCKS.ICE,
    fadeIn: 0,
    fadeOut: 0,
  },
}
