/**
 *
 * Sorting in different collections based on
 * - which biome item belongs
 * - which landscape (e.g. noise level or elevation range) item can spawn
 * - used distribution profile: according to item size,
 *
 * Landscape collection examples:
 * bocage normand, forêts champenoise, garrigue méditérannéene
 *
 */

export const SCHEMATICS_COLLECTIONS = {
  tropical_beach_light: {
    'trees/palmtree_big_1': 1,
    'trees/palmtree_big_2': 5,
    'trees/palmtree_big_3': 5,
    void: 20,
  },
  tropical_beach_compact: {
    'trees/palmtree_1': 1,
    'trees/palmtree_2': 1,
    'trees/palmtree_3': 1,
    'trees/palmtree_4': 1,
    'trees/palmtree_5': 1,
    'trees/palmtree_6': 1,
    'trees/palmtree_7': 1,
    'trees/palmtree_8': 1,
    'trees/palmtree_9': 1,
  },
  beach_house: {
    'buildings/house': 1,
    void: 20,
  },
}
