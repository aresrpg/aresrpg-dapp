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
  WebGLRenderTarget,
  DepthTexture,
  HalfFloatType,
  LinearFilter,
} from 'three'
import { aiter } from 'iterator-helper'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import CameraControls from 'camera-controls'
import { create_client } from '@aresrpg/aresrpg-protocol'
import { useWebSocket } from '@vueuse/core'
import { ref, watch } from 'vue'

import { combine } from '../utils/iterator.js'
import ui_fps from '../modules/ui_fps.js'
import game_camera from '../modules/game_camera.js'
import game_render from '../modules/game_render.js'
import window_resize from '../modules/window_resize.js'
import player_inputs from '../modules/player_inputs.js'
import player_movement from '../modules/player_movement.js'
import ui_settings from '../modules/ui_settings.js'
import player_settings from '../modules/player_settings.js'
import game_sky from '../modules/game_sky.js'
import player_characters from '../modules/player_characters.js'
import game_lights from '../modules/game_lights.js'
import game_audio from '../modules/game_audio.js'
import game_entities from '../modules/game_entities.js'
import game_terrain from '../modules/game_terrain.js'
import game_instanced from '../modules/game_instanced.js'
import create_pools from '../game/pool.js'
import logger from '../../logger.js'
import { VITE_SERVER_MAINNET_URL, VITE_SERVER_TESTNET_URL } from '../../env.js'
import sui_data from '../modules/sui_data.js'
import sui_wallets from '../modules/sui_wallets.js'
import { decrease_loading } from '../utils/loading.js'
import game_connect from '../modules/game_connect.js'

import { handle_server_error } from './error_handler.js'

export const GRAVITY = 9.81

const LOADING_MANAGER = DefaultLoadingManager
const FILTER_ACTION_IN_LOGS = [
  'action/keydown',
  'action/keyup',
  'action/set_state_player_position',
  'action/sky_lights_change',
]
export const FILTER_PACKET_IN_LOGS = ['packet/characterPosition']

LOADING_MANAGER.onStart = (url, items_loaded, items_total) => {
  window.dispatchEvent(new Event('assets_loading'))
  logger.ASSET(`Loading asset ${url}`, { items_loaded, items_total })
}

LOADING_MANAGER.onLoad = () => {
  logger.ASSET('All assets loaded')
  window.dispatchEvent(new Event('assets_loaded'))
}

/** @typedef {typeof INITIAL_STATE} State */
/** @typedef {Omit<Readonly<typeof context>, 'actions'>} Context */
/** @typedef {(state: State, action: Type.Action) => State} Reducer */
/** @typedef {(context: Context) => void} Observer */
/** @typedef {(state: State, context: Context, delta: number) => void} Ticker */
/** @typedef {() => { reduce?: Reducer, observe?: Observer, tick?: Ticker }} Module */
/** @typedef {import("three").AnimationAction} AnimAction */
/** @typedef {typeof INITIAL_STATE.settings.sky.lights} SkyLights */

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

    sky: {
      paused: false,
      value: 0.78,
      sun_size: 0.0004,

      lights: {
        version: -1,

        fog: {
          color: new Color(0xffffff),
        },

        directional: {
          position: new Vector3(0, 1, 0),
          color: new Color(0xffffff),
          intensity: 1,
        },

        ambient: {
          color: new Color(0xffffff),
          intensity: 1.5,
        },
      },
    },

    view_distance: 100,

    free_camera: false,
  },

  inputs: {
    mouse_left: false,
    mouse_right: false,
    forward: false,
    backward: false,
    left: false,
    right: false,
    walk: false,
    jump: false,
    dance: false,
  },

  selected_character_id: 'default',

  /** @type {Type.ThreeEntity[]} */
  characters: [],

  sui: {
    /** @type {Type.Wallet[]} */
    wallets: [],
    /** @type {Type.SuiCharacter[]} */
    locked_characters: [],
    /** @type {Type.SuiCharacter[]} */
    unlocked_characters: [],
    selected_wallet_name: null,
    selected_address: null,
    balance: null,
    /** @type {Type.Receipt[]} */
    character_lock_receipts: [],
  },

  // is the user connected to the websocket
  online: false,

  inventory: [],

  // represents other characters on the map
  /** @type {Map<string, Type.ThreeEntity>} */
  visible_characters: new Map(),
}

/** @type {(state?: INITIAL_STATE) => Type.ThreeEntity & Type.SuiCharacter} */
export function current_character(state = get_state()) {
  const by_id = ({ id }) => id === state.selected_character_id
  const three_character = state.characters.find(by_id)
  const sui_character = state.sui.locked_characters.find(by_id)

  return {
    ...sui_character,
    ...three_character,
  }
}

// @ts-ignore
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

  sui_data,
  sui_wallets,

  window_resize,

  player_inputs,
  player_settings,
  player_characters,
  player_movement,

  game_sky,
  game_render,
  game_lights,
  game_instanced,
  game_camera,
  game_audio,
  game_entities,
  game_terrain,
  game_connect,
]

function last_event_value(emitter, event, default_value = null) {
  let value = default_value
  emitter.on(event, new_value => {
    value = new_value
  })
  return () => value
}

let ares_client = null

const ws_status = ref('')
const game_visible_emitter = new EventEmitter()

const scene = new Scene()
const packets = new PassThrough({ objectMode: true })
const renderer = new WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(window.devicePixelRatio)
const renderer_size = renderer.getSize(new Vector2())
const composer = new EffectComposer(
  renderer,
  new WebGLRenderTarget(renderer_size.x, renderer_size.y, {
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    generateMipmaps: false,
    stencilBuffer: false,
    type: HalfFloatType,
    depthBuffer: true,
    depthTexture: new DepthTexture(renderer_size.x, renderer_size.y),
  }),
)
const camera = new PerspectiveCamera(
  60, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  3000, // Far clipping plane
)
const pool = create_pools(scene)

const orthographic_camera = new OrthographicCamera()
/** @type {Type.Events} */
// @ts-ignore
const events = new EventEmitter()
const actions = new PassThrough({ objectMode: true })
/** @type {() => State} */
const get_state = last_event_value(events, 'STATE_UPDATED', INITIAL_STATE)
const controller = new AbortController()

scene.background = new Color('#000000')
scene.fog = new Fog('#000000', 0.25 * camera.far, 0.98 * camera.far)

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

export function get_server_url(network) {
  if (network === 'testnet') return VITE_SERVER_TESTNET_URL
  else if (network === 'mainnet') return VITE_SERVER_MAINNET_URL
}

function connect_ws() {
  return new Promise((resolve, reject) => {
    const { selected_address, selected_wallet_name, wallets } = get_state().sui
    const { chain } = wallets[selected_wallet_name]
    const [, network] = chain.split(':')
    const server_url = get_server_url(network).replaceAll('http', 'ws')
    const { status } = useWebSocket(
      `${server_url}?address=${selected_address}`,
      {
        autoReconnect: false,
        async onDisconnected(ws, event) {
          decrease_loading()
          await handle_server_error(event.reason)
          ares_client?.notify_end(event.reason)
          logger.SOCKET(`disconnected: ${event.reason}`)

          context.dispatch('action/set_online', true)
          context.dispatch('action/set_online', false)

          const { visible_characters } = context.get_state()
          visible_characters.forEach(character => character.remove())
          visible_characters.clear()

          reject(new Error('Disconnected from server'))
        },
        onMessage(ws, event) {
          const message = event.data
          ares_client?.notify_message(message)
        },
        onConnected: ws => {
          ws.binaryType = 'arraybuffer'
          logger.SOCKET(`connected to ${server_url}`)

          ares_client = create_client({
            socket_write: ws.send.bind(ws),
            socket_end: message => ws.close(1000, message),
          })

          ares_client.stream.pipe(packets)

          resolve()
        },
      },
    )

    watch(status, value => {
      ws_status.value = value
    })
  })
}

const context = {
  events,
  actions,
  pool,
  composer,
  // @ts-ignore
  camera_controls: new CameraControls(camera, renderer.domElement),
  /** @type {import("@aresrpg/aresrpg-protocol/src/types.js").send} */
  send_packet(type, payload) {
    if (!ares_client || ares_client.controller.signal.aborted) return // not connected
    if (!FILTER_PACKET_IN_LOGS.includes(type)) logger.NETWORK_OUT(type, payload)
    ares_client.send(type, payload)
  },
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
  on_game_show: handler => {
    game_visible_emitter.on('show', handler)
  },
  on_game_hide: handler => {
    game_visible_emitter.on('hide', handler)
  },
}

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
        if (!FILTER_ACTION_IN_LOGS.includes(action.type)) {
          logger.INTERNAL(action.type, action.payload)
        }
      } else if (!FILTER_PACKET_IN_LOGS.includes(action.type)) {
        logger.NETWORK_IN(action.type, action.payload)
      }
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
let canvas_applied = false

function animate() {
  requestAnimationFrame(animate)

  if (running && performance.now() >= time_target) {
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

    if (frame_duration !== next_frame_duration) {
      frame_duration = next_frame_duration
    }

    time_target += frame_duration
    if (performance.now() >= time_target) time_target = performance.now()
  }
}

export function set_canvas(canvas) {
  if (canvas_applied) return
  canvas_applied = true
  canvas.appendChild(renderer.domElement)
  animate()
}

export function run_game() {
  running = true
  game_visible_emitter.emit('show')
}

export function pause_game() {
  running = false
  game_visible_emitter.emit('hide')
}

export function disconnect_ws() {
  const { online } = get_state()
  if (online) {
    logger.SOCKET('Disconnecting from server')

    ares_client.end('USER_DISCONNECTED')
    context.dispatch('action/set_online', false)
  }
}

export { context, ws_status, ares_client }
