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

import { SCHEMPACKS } from './world_schem_conf.js'

const TREES = SCHEMPACKS.TREES.types

/**
 * Temperate flora set
 */

const temperate_forest = {
  small: {
    Acer_pseudoplatanus1: 1,
    Corylus_avellana1: 1,
    Malus_sylvestris1: 1,
    Quercus_robur1: 1,
  },
  medium: {
    [TREES.Aesculus_hippocastanum1]: 1,
    [TREES.Fraxinus_excelsior1]: 1,
    [TREES.Populus_tremula1]: 1, // tall tree
    [TREES.Pinus_sylvestris1]: 1,
    [TREES.Juglans_regia1]: 1,
  },
  tall: {
    [TREES.Fagus_sylvatica1]: 1,
  },
}

/**
 * Alpine flora set
 */

const alpine = {
  small: {
    [TREES.Alnus_glutinosa1]: 1,
    [TREES.Pinus_mugo1]: 1,
    [TREES.Populus_nigra1]: 1,
  },
  medium: {
    [TREES.Betula_pubescens1]: 1,
    [TREES.Larix_decidua1]: 1,
    [TREES.Picea_abies1]: 1,
    [TREES.Picea_omorika1]: 1,
  },
  tall: {
    [TREES.Pinus_cembra1]: 1,
  },
}

/**
 * Siberian flora set
 */

const siberian = {
  small: {},
  medium: {
    [TREES.Picea_omorika1]: 1,
    [TREES.Pinus_sylvestris1]: 3,
  },
  tall: {
    [TREES.Populus_tremula1]: 1,
  },
}

/**
 * Mediterranean flora set
 */

const mediterannean = {
  small: {
    [TREES.Laurus_nobilis1]: 1,
    [TREES.Olea_europaea1]: 1,
    [TREES.Prunus_amygdalus1]: 1,
    [TREES.Quercus_coccifera1]: 1,
  },
  medium: {
    [TREES.Ceratonia_siliqua1]: 1,
    [TREES.Cupressus_sempervirens1]: 1,
    [TREES.Pinus_nigra1]: 1,
    [TREES.Pinus_pinea1]: 1,
  },
  tall: {
    [TREES.Cedrus_libani1]: 1,
  },
}

/**
 * Distribution collections
 */

export const biome_flora_collections = {
  temperate_forest,
  alpine,
  mediterannean,
  siberian,
}
