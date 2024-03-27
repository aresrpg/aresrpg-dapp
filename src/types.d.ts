declare module '*.ogg'
declare module '*.png'
declare module '*.jpg'
declare module '*.gltf?url'
declare module '*.fbx?url'
declare module '*.glsl?url'

declare module 'stream' {
  class PassThrough {
    constructor(options?: any)
    write(chunk: any): void
  }
}

declare module 'three/addons/capabilities/WebGL.js' {
  function isWebGLAvailable(): boolean
}

declare namespace Type {
  type Module = import('./core/game/game').Module
  type State = import('./core/game/game').State
  type Packets = import('@aresrpg/aresrpg-protocol/src/types').Packets
  type GameState = 'MENU' | 'GAME' | 'EDITOR'
  type Await<T> = T extends Promise<infer U> ? U : T
  type Position = { x: number; y: number; z: number }
  type SkyLights = import('./core/game/game').SkyLights

  type Entity = {
    id: string
    title: import('troika-three-text').Text
    height: number
    radius: number
    level: number
    siblings: { name: string; level: number }[]
    position: import('three').Vector3
    target_position: Position
    set_low_priority?: (skip: boolean) => void
    move: (position: Position) => void
    rotate: (rotation: import('three').Vector3) => void
    animate: (name: string) => void
    remove: () => void
    mixer?: import('three').AnimationMixer
  }

  // Distributed actions which can be dispatched and then reduced
  type Actions = {
    'action/show_fps': boolean
    'action/target_fps': number
    'action/show_entities_collider': boolean
    'action/keydown': string
    'action/keyup': string
    'action/load_game_state': GameState
    'action/register_player': Entity
    'action/select_character': string
    'action/view_distance': number
    'action/far_view_distance': number
    'action/free_camera': boolean
    'action/sky_lights_change': SkyLights
  } & Packets

  type Events = import('@aresrpg/aresrpg-protocol/src/types').TypedEmitter<
    {
      STATE_UPDATED: State // the game state has been updated
      MOVE_MENU_CAMERA: [number, number, number] // move the camera of the menu screen
      CONNECT_TO_SERVER: void // request ws connection to the server
      SET_TIME: number // set the time of the day
      CLEAR_CHUNKS: void // clear all chunks
      CHUNKS_LOADED: void // notify that the loading of new chunks is finished
      SKY_CYCLE_PAUSED: boolean // pause/resume the normal running of time
      SKY_CYCLE_CHANGED: { value: number; fromUi: boolean } // the daytime has changed
      SKY_SUNSIZE_CHANGED: number
      SKY_FOGCOLOR_CHANGED: Color
      SKY_LIGHT_COLOR_CHANGED: Color
      SKY_LIGHT_MOVED: Vector3
      SKY_LIGHT_INTENSITY_CHANGED: number
    } & Packets
  >

  type Action = {
    [K in keyof Actions]: { type: K; payload: Actions[K] }
  }[keyof Actions]
}
