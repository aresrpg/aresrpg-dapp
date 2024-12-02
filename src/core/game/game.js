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
  Clock,
  WebGLRenderTarget,
  DepthTexture,
  HalfFloatType,
  LinearFilter,
  Frustum,
  PCFSoftShadowMap,
  DirectionalLight,
} from 'three'
import { aiter } from 'iterator-helper'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import CameraControls from 'camera-controls'
import { create_client } from '@aresrpg/aresrpg-protocol'
import { useWebSocket } from '@vueuse/core'
import { ref, watch } from 'vue'
import { VoxelmapCollider, VoxelmapCollisions } from '@aresrpg/aresrpg-engine'
import { WorldEnv } from '@aresrpg/aresrpg-world'

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
import game_water from '../modules/game_water.js'
import game_damage_ui from '../modules/game_damage_ui.js'
import logger from '../../logger.js'
import { VITE_SERVER_URL } from '../../env.js'
import sui_data from '../modules/sui_data.js'
import sui_wallets from '../modules/sui_wallets.js'
import { decrease_loading } from '../utils/loading.js'
import game_connect from '../modules/game_connect.js'
import player_action from '../modules/player_action.js'
import player_health from '../modules/player_health.js'
import player_pet from '../modules/player_pet.js'
import player_skin from '../modules/player_skin.js'
import player_equipment from '../modules/player_equipment.js'
import toast from '../../toast.js'
import { i18n } from '../../i18n.js'
import game_entites_stroll from '../modules/game_entites_stroll.js'
import player_entities_interract from '../modules/player_entities_interract.js'
import game_fights from '../modules/game_fights.js'
import { listen_for_requests } from '../sui/client.js'
import player_experience from '../modules/player_experience.js'
import player_error from '../modules/player_error.js'

import { handle_server_error, notify_reconnected } from './error_handler.js'
// @ts-ignore
import { CustomCameraControls } from './custom_camera_control.js'

// @ts-ignore
import MdiClippy from '~icons/mdi/clippy'

const LOADING_MANAGER = DefaultLoadingManager
const FILTER_ACTION_IN_LOGS = [
  'action/keydown',
  'action/keyup',
  'action/set_state_player_position',
  'action/sky_lights_change',
  'action/mousedown',
  'action/mouseup',
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

export const VIEW_DISTANCE_MIN = 50
export const VIEW_DISTANCE_MAX = 1000

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

        godrays: {
          position: new Vector3(0, 1, 0),
          color: new Color(0xffffff),
          intensity: 1,
        },
      },
    },

    water: {
      color: new Color(0x29b6f6),
    },

    view_distance: 50,

    camera: {
      is_free: false,
      is_underwater: false,
    },

    postprocessing: {
      version: 0,
      enabled: true,

      cartoon_pass: {
        enabled: true,
        thick_lines: window.devicePixelRatio >= 1.3,
      },

      godrays_pass: {
        enabled: false,
        light_size: 0.0025,
        max_intensity: 1,
        exposure: 0.3,
        samplesCount: 100,
        density: 0.45,
      },

      volumetric_fog_pass: {
        enabled: true,
        threshold: 0.6,
        smoothness: 0.2,
      },

      bloom_pass: {
        enabled: false,
        strength: 0.2,
      },

      underwater_pass: {
        enabled: true,
      },
    },
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
  },

  selected_character_id: 'default',

  /** @type {Type.ThreeEntity[]} */
  characters: [],

  sui: {
    /** @type {Type.Wallet[]} */
    wallets: [],
    /** @type {Type.SuiCharacter[]} */
    characters: [],
    /** @type {Type.SuiItem[]} */
    items: [],
    /** @type {Type.SuiItem[]} */
    items_for_sale: [],

    /** @type {String} */
    selected_wallet_name: null,
    /** @type {String} */
    selected_address: null,
    /** @type {BigInt} */
    balance: null,
    /** @type {Type.SuiToken[]} */
    tokens: [],
    admin_caps: [],

    finished_crafts: [],
    recipes: [],
  },

  // is the user connected to the websocket
  online: false,

  inventory: [],

  // represents other characters on the map
  /** @type {Map<string, Type.FullCharacter>} */
  visible_characters: new Map(),
  // link a mob group to a list of mob ids
  /** @type {Map<string, Type.MobGroup>} */
  visible_mobs_group: new Map(),
  /** @type {Map<string, Type.Fight>} */
  visible_fights: new Map(),
}

/** @return {Type.ThreeEntity} */
export function current_three_character(state = get_state()) {
  return state.characters.find(({ id }) => id === state.selected_character_id)
}

/** @return {Type.SuiCharacter} */
export function current_sui_character(state = get_state()) {
  return state.sui.characters.find(
    ({ id }) => id === state.selected_character_id,
  )
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
  player_action,
  player_health,
  player_pet,
  player_skin,
  player_equipment,
  player_entities_interract,
  player_experience,
  player_error,

  game_sky,
  game_render,
  game_lights,
  game_camera,
  game_audio,
  game_entities,
  game_terrain,
  game_water,
  game_connect,
  game_entites_stroll,
  game_damage_ui,

  game_fights,
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
  failIfMajorPerformanceCaveat: true,
})

if (!renderer) {
  toast.error(i18n.global.t('BROWSER_NO_PERF'), 'Rekt!', MdiClippy, 15000)
  decrease_loading()
  throw new Error('Failed to create WebGLRenderer')
}

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
  70, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  500, // Far clipping plane
)
camera.layers.enableAll()

/** @type {Type.Events} */
// @ts-ignore
const events = new EventEmitter()
const actions = new PassThrough({ objectMode: true })
/** @type {() => State} */
const get_state = last_event_value(events, 'STATE_UPDATED', INITIAL_STATE)
const controller = new AbortController()

scene.background = new Color('#000000')
scene.fog = new Fog('#000000', 0.25 * camera.far, 0.98 * camera.far)

const directional_light = new DirectionalLight(0xffffff, 1)

renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x263238 / 2, 1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = Math.pow(0.6, 4.0)
renderer.info.autoReset = false
// renderer.debug.checkShaderErrors = false

composer.setSize(window.innerWidth, window.innerHeight)

const voxelmap_collider = new VoxelmapCollider({
  chunkSize: WorldEnv.current.chunkDimensions,
  voxelsChunkOrdering: 'zxy',
})
const voxelmap_collisions = new VoxelmapCollisions({
  voxelmapCollider: voxelmap_collider,
})

let currently_connecting = false
let reconnect_toast = null
let connecting_toast = null

events.on('USER_LOGOUT', () => {
  reconnect_toast?.remove()
})

function connect_ws() {
  if (currently_connecting) return
  currently_connecting = true

  if (reconnect_toast) reconnect_toast.remove()

  logger.SOCKET('Connecting to server')

  if (!connecting_toast)
    connecting_toast = toast.tx(i18n.global.t('WS_CONNECTING_TO_SERVER'))
  return new Promise((resolve, reject) => {
    const { selected_address } = get_state().sui
    const server_url = VITE_SERVER_URL.replaceAll('http', 'ws')

    const { status } = useWebSocket(
      `${server_url}?address=${selected_address}`,
      {
        autoReconnect: false,
        async onDisconnected(ws, event) {
          currently_connecting = false

          decrease_loading()
          const should_reconnect = await handle_server_error(event.reason)
          ares_client?.notify_end(event.reason)
          logger.SOCKET(`disconnected: ${event.reason}`)

          context.dispatch('action/set_online', false)

          const { visible_characters, visible_mobs_group } = context.get_state()
          visible_characters.forEach(character => character.remove())
          visible_characters.clear()

          visible_mobs_group.forEach(({ entities }) =>
            entities.forEach(mob => mob.remove()),
          )
          visible_mobs_group.clear()

          if (context.get_state().sui.selected_address && should_reconnect)
            setTimeout(() => {
              connect_ws().catch(error => {
                console.error('Failed to reconnect:', error)
              })
            }, 1000)
          else if (context.get_state().sui.selected_address) {
            reconnect_toast = toast.tx(
              i18n.global.t('SERVER_CLICK_TO_CONNECT'),
              i18n.global.t('SERVER_NOT_CONNECTED'),
              {
                button: true,
                button_text: i18n.global.t('SERVER_RECONNECT_BUTTON'),
                button_action: () => events.emit('RECONNECT_TO_SERVER'),
                icon: 'sword',
              },
            )
          }

          reject(new Error('Disconnected from server'))
        },
        onMessage(ws, event) {
          const message = event.data
          ares_client?.notify_message(message)
        },
        onConnected: ws => {
          ws.binaryType = 'arraybuffer'
          logger.SOCKET(`connected to ${server_url}`)

          notify_reconnected()

          ares_client = create_client({
            socket_write: ws.send.bind(ws),
            socket_end: message => ws.close(1000, message),
          })

          ares_client.stream.pipe(packets)

          connecting_toast.update(
            'success',
            i18n.global.t('WS_CONNECTED_TO_SERVER'),
          )

          resolve()
        },
      },
    )

    watch(status, value => {
      ws_status.value = value
    })
  }).catch(error => {
    console.error('Failed to connect:', error)
    connecting_toast.update('error', i18n.global.t('WS_FAILED_TO_CONNECT'))
  })
}

const context = {
  events,
  actions,
  composer,
  /** @type {CustomCameraControls & import("camera-controls").default} */
  // @ts-ignore
  camera_controls: new CustomCameraControls(
    camera,
    renderer.domElement,
    voxelmap_collisions,
  ),
  /** @type {ReturnType<import("@aresrpg/aresrpg-protocol")["create_client"]>["send"]} */
  send_packet(type, payload) {
    if (!ares_client || ares_client.controller.signal.aborted) {
      logger.SOCKET('Cannot send packet, not connected', { type, payload })
      toast.error(i18n.global.t('WS_NOT_CONNECTED'), 'Oh no!', MdiClippy)
      return
    }
    if (!FILTER_PACKET_IN_LOGS.includes(type)) logger.NETWORK_OUT(type, payload)
    ares_client.send(type, payload)
  },
  /** @type {() => Promise<void>} */
  connect_ws,
  // Indicates if the user is connected to the websocket
  is_online() {
    return get_state().online
  },
  /**
   * @template {keyof Type.Actions} K
   * @param {K} type
   * @param {Type.Actions[K]} [payload] */
  dispatch(type, payload) {
    actions.write({ type, payload })
  },
  frustum: new Frustum(),
  mouse_raycaster: new Raycaster(),
  mouse_position: new Vector2(),
  get_state,
  scene,
  renderer,
  camera,
  directional_light,
  signal: controller.signal,
  controller,
  on_game_show: handler => {
    game_visible_emitter.on('show', handler)
  },
  on_game_hide: handler => {
    game_visible_emitter.on('hide', handler)
  },
  switch_to_isometric() {
    console.log('SWITCH TO ISOMETRIC')

    // Set constraints to maintain isometric-like view
    context.camera_controls.maxPolarAngle = Math.PI / 4 // Limit vertical rotation
    context.camera_controls.minPolarAngle = Math.PI / 4 // Limit vertical rotation
    context.camera_controls.maxAzimuthAngle = Infinity // Allow full horizontal rotation
    context.camera_controls.minAzimuthAngle = -Infinity // Allow full horizontal rotation
    // @ts-ignore
    context.camera_controls.enableDamping = true // Enable smooth camera movement
    context.camera_controls.dampingFactor = 0.05 // Adjust damping factor as needed
  },
  switch_to_perspective() {
    // context.camera = camera
    // context.camera_controls.camera = camera
    // // Reset constraints for free movement in perspective view
    // context.camera_controls.maxPolarAngle = Math.PI // Allow full vertical rotation
    // context.camera_controls.minPolarAngle = 0 // Allow full vertical rotation
    // context.camera_controls.maxAzimuthAngle = Infinity // Allow full horizontal rotation
    // context.camera_controls.minAzimuthAngle = -Infinity // Allow full horizontal rotation
  },
  physics: {
    voxelmap_collider,
    voxelmap_collisions,
  },
}

listen_for_requests()

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
        .reduce((intermediate, reducer) => {
          const result = reducer(intermediate, action)
          if (!result)
            throw new Error(`Reducer ${reducer} didn't return a state`)
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

const reusable_matrix4 = new Matrix4()

window.addEventListener('mousemove', event => {
  context.mouse_position.x = (event.clientX / window.innerWidth) * 2 - 1
  context.mouse_position.y = -(event.clientY / window.innerHeight) * 2 + 1
})

function animate() {
  requestAnimationFrame(animate)

  if (running && performance.now() >= time_target) {
    const state = get_state()
    const delta = Math.min(clock.getDelta(), 0.5)

    context.frustum.setFromProjectionMatrix(
      reusable_matrix4
        .identity()
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    )

    modules
      .map(({ tick }) => tick)
      .filter(Boolean)
      .forEach(tick => tick(state, context, delta))

    renderer.info.reset()

    if (state.settings.postprocessing.enabled) {
      composer.render()
    } else {
      renderer.render(scene, context.camera)
    }

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

export function disconnect_ws(reason = 'USER_DISCONNECTED') {
  const { online } = get_state()
  if (online) {
    logger.SOCKET('Disconnecting from server')

    ares_client.end(reason)
    context.dispatch('action/set_online', false)
  }
}

export { context, ws_status, ares_client }

globalThis.get_state = get_state
