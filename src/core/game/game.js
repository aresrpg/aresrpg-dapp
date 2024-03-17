import { EventEmitter } from 'events'
import { PassThrough } from 'stream'

import {
  Scene,
  Vector3,
  Color,
  WebGLRenderer,
  PerspectiveCamera,
  Fog,
  SRGBColorSpace,
  VSMShadowMap,
  DefaultLoadingManager,
  ACESFilmicToneMapping,
  Vector2,
  Vector4,
  Quaternion,
  Matrix4,
  Spherical,
  Box3,
  Sphere,
  Raycaster,
  OrthographicCamera,
  Clock,
} from 'three'
import { aiter } from 'iterator-helper'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import CameraControls from 'camera-controls'

import { combine } from '../core-utils/iterator.js'
import ui_fps from '../modules/ui_fps.js'
import game_camera from '../modules/game_camera.js'
import game_render from '../modules/game_render.js'
import window_resize from '../modules/window_resize.js'
import player_inputs from '../modules/player_inputs.js'
import player_movement from '../modules/player_movement.js'
import ui_settings from '../modules/ui_settings.js'
import player_settings from '../modules/player_settings.js'
import game_sky from '../modules/game_sky.js'
import game_connect from '../modules/game_connect.js'
import player_characters from '../modules/player_characters.js'
import game_lights from '../modules/game_lights.js'
import game_audio from '../modules/game_audio.js'
import game_entities from '../modules/game_entities.js'
import game_chunks from '../modules/game_chunks.js'
import player_spawn from '../modules/player_spawn.js'
import game_instanced from '../modules/game_instanced.js'
import create_pools from '../game/pool.js'
import logger from '../../logger.js'

export const GRAVITY = 9.81

const LOADING_MANAGER = DefaultLoadingManager
const FILTER_ACTION_IN_LOGS = [
  'action/keydown',
  'action/keyup',
  'action/set_state_player_position',
]
export const FILTER_PACKET_IN_LOGS = [
  'packet/playerPosition',
  'packet/entityMove',
]

LOADING_MANAGER.onStart = (url, itemsLoaded, itemsTotal) => {
  window.dispatchEvent(new Event('assets_loading'))
  logger.ASSET(`Loading asset ${url}`, { itemsLoaded, itemsTotal })
}

LOADING_MANAGER.onLoad = () => {
  logger.ASSET('All assets loaded')
  window.dispatchEvent(new Event('assets_loaded'))
}

/** @typedef {typeof INITIAL_STATE} State */
/** @typedef {Omit<Readonly<Awaited<ReturnType<typeof create_context>>>, 'actions'>} Context */
/** @typedef {(state: State, action: Type.Action) => State} Reducer */
/** @typedef {(context: Context) => void} Observer */
/** @typedef {(state: State, context: Context, delta: number) => void} Ticker */
/** @typedef {() => { name: string, reduce?: Reducer, observe?: Observer, tick?: Ticker }} Module */
/** @typedef {import("three").AnimationAction} AnimAction */

export const INITIAL_STATE = {
  settings: {
    target_fps: 120,
    mouse_sensitivity: 0.005,
    show_fps: true,
    keymap: new Map([
      ['KeyW', 'forward'],
      ['KeyS', 'backward'],
      ['KeyA', 'left'],
      ['KeyD', 'right'],
      ['Space', 'jump'],
      ['KeyF', 'dance'],
      ['ShiftLeft', 'walk'],
    ]),
    show_entities_collider: false,

    view_distance: 3,
    far_view_distance: 20,

    free_camera: false,
  },

  inputs: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    walk: false,
    jump: false,
    dance: false,
  },

  /** @type {Type.Entity} */
  player: null,
  selected_character_id: 'default',
  characters_limit: 3,
  /** @type {import("@aresrpg/aresrpg-protocol/src/types").Character[]} */
  characters: [
    {
      id: 'default',
      name: 'Anon',
      position: { x: 0, y: 100, z: 0 },
      level: 1,
      head: 0,
      cape: 0,
      classe: 'IOP',
      female: false,
    },
  ],

  /** @type {Map<string, Type.Entity & { jump_time: number, target_position: import("three").Vector3, action: string, audio: import("three").PositionalAudio }>} */
  entities: new Map(),
}

CameraControls.install({
  THREE: {
    Vector2,
    Vector3,
    Vector4,
    Quaternion,
    Matrix4,
    Spherical,
    Box3,
    Sphere,
    Raycaster,
  },
})

const MODULES = [
  ui_fps,
  ui_settings,

  window_resize,

  player_inputs,
  player_settings,
  player_characters,
  player_movement,
  player_spawn,

  game_sky,
  // game_connect,
  game_render,
  game_lights,
  game_instanced,
  game_camera,
  game_audio,
  game_entities,
  game_chunks,
]

function last_event_value(emitter, event, default_value = null) {
  let value = default_value
  emitter.on(event, new_value => {
    value = new_value
  })
  return () => value
}

// create the context passed to all modules
async function create_context({
  send_packet,
  connect_ws,
  on_game_show,
  on_game_hide,
}) {
  const scene = new Scene()
  const renderer = new WebGLRenderer({ antialias: true })
  const composer = new EffectComposer(renderer)
  const camera = new PerspectiveCamera(
    60, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1500, // Far clipping plane
  )
  const Pool = create_pools(scene)
  const orthographic_camera = new OrthographicCamera()
  /** @type {Type.Events} */
  // @ts-ignore
  const events = new EventEmitter()
  const actions = new PassThrough({ objectMode: true })
  /** @type {() => State} */
  const get_state = last_event_value(events, 'STATE_UPDATED', INITIAL_STATE)
  const controller = new AbortController()

  scene.background = new Color('#000000')
  scene.fog = new Fog('#000000', 0, 1500)

  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x263238 / 2, 1)
  renderer.shadowMap.enabled = true
  renderer.outputColorSpace = SRGBColorSpace
  // renderer.shadowMap.type = VSMShadowMap
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = Math.pow(0.6, 4.0)
  renderer.info.autoReset = false
  // renderer.debug.checkShaderErrors = false

  composer.setSize(window.innerWidth, window.innerHeight)

  return {
    events,
    actions,
    Pool,
    composer,
    camera_controls: new CameraControls(camera, renderer.domElement),
    /** @type {import("@aresrpg/aresrpg-protocol/src/types").create_client['send']} */
    send_packet,
    /** @type {() => Promise<void>} */
    connect_ws,
    /**
     * @template {keyof Type.Actions} K
     * @param {K} type
     * @param {Type.Actions[K]} [payload] */
    dispatch(type, payload) {
      actions.write({ type, payload })
    },
    get_state,
    scene,
    renderer,
    orthographic_camera,
    camera,
    signal: controller.signal,
    controller,
    on_game_show,
    on_game_hide,
  }
}

export default async function create_game({
  packets,
  send_packet,
  connect_ws,
  on_game_show,
  on_game_hide,
}) {
  const { actions, ...context } = await create_context({
    send_packet,
    connect_ws,
    on_game_show,
    on_game_hide,
  })

  const {
    events,
    renderer,
    get_state,
    dispatch,
    composer,
    scene,
    camera,
    controller,
  } = context

  const modules = MODULES.map(create => create())

  modules
    .map(({ observe }) => observe)
    .filter(Boolean)
    .forEach(observe => observe(context))

  // pipe the actions and packets through the reducers
  aiter(combine(actions, packets))
    .reduce(
      (last_state, /** @type {Type.Action} */ action) => {
        const state = modules
          .map(({ reduce }) => reduce)
          .filter(Boolean)
          .reduce((intermediate, fn) => {
            const result = fn(intermediate, action)
            if (!result) throw new Error(`Reducer ${fn} didn't return a state`)
            return result
          }, last_state)
        if (action.type.includes('action/')) {
          if (!FILTER_ACTION_IN_LOGS.includes(action.type))
            logger.INTERNAL(action.type, action.payload)
        } else if (!FILTER_PACKET_IN_LOGS.includes(action.type))
          logger.NETWORK_IN(action.type, action.payload)
        events.emit(action.type, action.payload)
        events.emit('STATE_UPDATED', state)
        return state
      },
      {
        ...INITIAL_STATE,
      },
    )
    .catch(error => {
      console.error(error)
    })

  const clock = new Clock()
  let frame_duration = 1000 / INITIAL_STATE.settings.target_fps
  let time_target = 0
  let running = true

  function animate() {
    if (!running) return
    requestAnimationFrame(animate)

    if (performance.now() >= time_target) {
      const state = get_state()
      const delta = Math.min(clock.getDelta(), 0.5)

      modules
        .map(({ tick }) => tick)
        .filter(Boolean)
        .forEach(tick => tick(state, context, delta))

      renderer.info.reset()
      // renderer.render(scene, camera)
      composer.render()

      const next_frame_duration = 1000 / state.settings.target_fps

      if (frame_duration !== next_frame_duration)
        frame_duration = next_frame_duration

      time_target += frame_duration
      if (performance.now() >= time_target) time_target = performance.now()
    }
  }

  return {
    events,
    dispatch,
    send_packet,
    start(container) {
      container.appendChild(renderer.domElement)
      animate()
    },
    stop() {
      running = false
      controller.abort()
    },
  }
}
