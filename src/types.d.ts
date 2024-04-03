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

  type ThreeEntity = {
    id: string
    height: number
    radius: number
    title: import('troika-three-text').Text
    position: import('three').Vector3
    target_position: Position | null
    set_low_priority?: (skip: boolean) => void
    apply_state: (entity: Partial<ThreeEntity>) => void
    move: (position: Position) => void
    rotate: (rotation: import('three').Vector3) => void
    animate: (name: string) => void
    remove: () => void
    mixer?: import('three').AnimationMixer
    jump_time: number
    action: string
    audio: import('three').PositionalAudio
  }

  // type Entity = {
  //   level: number
  //   siblings: { name: string; level: number }[]
  // }

  type SuiCharacter = {
    id: string
    name: string
    experience: number
    classe: string
    sex: string
    position: import('three').Vector3
  }

  type Receipt = {
    id: string
    storage_id: string
    character_id: string
  }

  type sigTransactionBlockParams = {
    transaction_block: import('@mysten/sui.js/transactions').TransactionBlock
    sender: string
  }

  type WalletAccount = import('@mysten/wallet-standard').WalletAccount & {
    alias: string
  }

  type Wallet = {
    accounts: WalletAccount[]
    chain: string
    icon: string
    name: string
    version: string
    connect: () => Promise
    disconnect: () => Promise
    signAndExecuteTransactionBlock: (
      param: sigTransactionBlockParams,
    ) => Promise
    signPersonalMessage: (
      message: string,
      address: string,
    ) => Promise<{ bytes: string; signature: string }>
    signTransactionBlock: (param: sigTransactionBlockParams) => Promise
  }

  // Distributed actions which can be dispatched and then reduced
  type Actions = {
    'action/show_fps': boolean
    'action/target_fps': number
    'action/keydown': string
    'action/keyup': string
    'action/select_character': string
    'action/view_distance': number
    'action/free_camera': boolean
    'action/sky_lights_change': SkyLights
    'action/add_character': SuiCharacter
    'action/remove_character': string
    'action/register_wallet': Wallet
    'action/select_wallet': string
    'action/select_address': string
    'action/sui_data_update': {
      balance?: bigint
      locked_characters?: SuiCharacter[]
      unlocked_characters?: SuiCharacter[]
      character_lock_receipts?: Receipt[]
    }
    'action/set_online': boolean
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
    } & Packets
  >

  type Action = {
    [K in keyof Actions]: { type: K; payload: Actions[K] }
  }[keyof Actions]
}
