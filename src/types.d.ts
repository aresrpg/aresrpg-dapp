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
  type Module = import('./core/game/game.js').Module
  type State = import('./core/game/game.js').State
  type Packets = import('@aresrpg/aresrpg-protocol/src/types.js').Packets
  type GameState = 'MENU' | 'GAME' | 'EDITOR'
  type Await<T> = T extends Promise<infer U> ? U : T
  type Position = { x: number; y: number; z: number }

  type ThreeEntity = {
    id: string
    height: number
    radius: number
    title: import('troika-three-text').Text
    position: import('three').Vector3
    target_position: Position | null
    object3d?: import('three').Object3D
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
    skin: string
  }

  // type Entity = {
  //   level: number
  //   siblings: { name: string; level: number }[]
  // }

  type SuiCharacter = import('@aresrpg/aresrpg-sdk/types').SuiCharacter
  type SuiItem = import('@aresrpg/aresrpg-sdk/types').SuiItem
  type SuiToken = import('@aresrpg/aresrpg-sdk/types').SuiToken

  type Spell = { name: string; icon: string }
  type FullCharacter = ThreeEntity &
    SuiCharacter & {
      spells: Spell[]
    }

  type Receipt = {
    id: string
    storage_id: string
    character_id: string
  }

  type sigTransactionParams = {
    transaction_block: import('@mysten/sui/transactions').Transaction
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
    signAndExecuteTransaction: (param: sigTransactionParams) => Promise
    signPersonalMessage: (
      message: string,
      address: string,
    ) => Promise<{ bytes: string; signature: string }>
    signTransaction: (param: sigTransactionParams) => Promise
  }

  // Distributed actions which can be dispatched and then reduced
  type Actions = {
    'action/show_fps': boolean
    'action/target_fps': number
    'action/postprocessing_changed': State['settings']['postprocessing']
    'action/keydown': string
    'action/keyup': string
    'action/mousedown': number
    'action/mouseup': number
    'action/window_focus': boolean
    'action/select_character': string
    'action/view_distance': number
    'action/free_camera': boolean
    'action/camera_went_underwater': boolean
    'action/sky_lights_change': State['settings']['sky_lights']
    'action/add_character': SuiCharacter & { skin?: string }
    'action/remove_character': string
    'action/register_wallet': Wallet
    'action/select_wallet': string
    'action/select_address': string
    'action/sui_data_update': {
      balance?: bigint
      locked_characters?: SuiCharacter[]
      unlocked_characters?: SuiCharacter[]
      locked_items?: SuiItem[]
      unlocked_items?: SuiItem[]
      items_for_sale?: SuiItem[]
      admin_caps?: string[]
      tokens?: SuiToken[]
    }

    'action/sui_add_unlocked_item': SuiItem
    'action/sui_add_locked_item': SuiItem
    'action/sui_add_item_for_sale': { id: string; list_price: bigint }
    'action/sui_add_unlocked_character': SuiCharacter
    'action/sui_add_locked_character': SuiCharacter
    'action/add_finished_craft': { id: string; recipe_id: string }
    'action/sui_remove_locked_item': string
    'action/sui_remove_unlocked_item': string
    'action/sui_remove_item_for_sale': { id: string; keep: boolean }
    'action/sui_remove_unlocked_character': string
    'action/sui_remove_locked_character': string
    'action/sui_remove_finished_craft': string
    'action/sui_update_item': SuiItem
    'action/sui_split_item': {
      item_id: string
      new_item_id: string
      amount: number
    }
    'action/sui_merge_item': {
      item_id: string
      target_item_id: string
      final_amount: number
    }
    'action/sui_equip_item': {
      slot: string
      item_id: string
      character_id: string
    }
    'action/sui_unequip_item': {
      character_id: string
      slot: string
    }
    'action/set_online': boolean
    'action/character_action': { id: string; action: string }
  } & Packets

  type Events = import('@aresrpg/aresrpg-protocol/src/types.d.ts').TypedEmitter<
    {
      STATE_UPDATED: State // the game state has been updated
      MOVE_MENU_CAMERA: [number, number, number] // move the camera of the menu screen
      CONNECT_TO_SERVER: void // request ws connection to the server
      SET_TIME: number // set the time of the day
      CHUNKS_LOADED: void // notify that the loading of new chunks is finished
      SKY_CYCLE_PAUSED: boolean // pause/resume the normal running of time
      SKY_CYCLE_CHANGED: { value: number; fromUi: boolean } // the daytime has changed
    } & Packets &
      Actions
  >

  type Action = {
    [K in keyof Actions]: { type: K; payload: Actions[K] }
  }[keyof Actions]
}
