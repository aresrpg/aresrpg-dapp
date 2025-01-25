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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  function isWebGLAvailable(): boolean
}

declare namespace Type {
  type Module = import('./core/game/game.js').Module
  type State = import('./core/game/game.js').State
  type Packets = import('@aresrpg/aresrpg-protocol/types').Packets
  type Fight = import('@aresrpg/aresrpg-protocol/types').Fight
  type GameState = 'MENU' | 'GAME' | 'EDITOR'
  type Await<T> = T extends Promise<infer U> ? U : T
  type Position = { x: number; y: number; z: number }

  type Object3D = import('three').Group<import('three').Object3DEventMap>
  type SuiCharacter = import('@aresrpg/aresrpg-sdk/types').SuiCharacter
  type SuiItem = import('@aresrpg/aresrpg-sdk/types').SuiItem
  type SuiToken = import('@aresrpg/aresrpg-sdk/types').SuiToken

  type ThreeEntity = {
    id: string
    height: number
    radius: number
    floating_title: import('troika-three-text').Text
    position: import('three').Vector3
    target_position: Position | null
    object3d?: import('three').Object3D
    set_low_priority: (skip: boolean) => void
    move: (position: Position) => void
    rotate: (rotation: import('three').Vector3) => void
    animate: (name: string) => void
    remove: () => void
    mixer: import('three').AnimationMixer
    jump_time: number
    action: string
    audio: import('three').PositionalAudio
    skin: string
    set_variant: (variant: string) => Promise<void>
    equip_hat(hat: SuiItem): Promise<void>
    equip_cape(cape: SuiItem): Promise<void>
    set_hair(): Promise<void>
    mob_group_id?: string
    current_fight_id?: string
    custom_colors: null | {
      needsUpdate(): boolean
      update(renderer: import('three').WebGLRenderer): void
      dispose(): void
      get_color1(): import('three').Color
      get_color2(): import('three').Color
      get_color3(): import('three').Color
      set_color1(color: import('three').Color): void
      set_color2(color: import('three').Color): void
      set_color3(color: import('three').Color): void
    }
    set_colors: (
      {
        color_1,
        color_2,
        color_3,
      }: {
        color_1: import('three').Color
        color_2: import('three').Color
        color_3: import('three').Color
      },
      renderer?: any,
    ) => void
  }

  type MobGroup = Omit<
    import('@aresrpg/aresrpg-protocol/types').EntityGroup,
    'entities'
  > & {
    entities: (ThreeEntity & {
      name: string
      level: number
      mob_group_id: string
      spawn_point: Position
    })[]
  }

  type Spell = { name: string; icon: string }
  type FullCharacter = ThreeEntity &
    SuiCharacter & {
      spells: Spell[]
    }

  type sigTransactionParams = {
    transaction_block: import('@mysten/sui/transactions').Transaction
    sender: string
  }

  type WalletAccount = import('@mysten/wallet-standard').WalletAccount & {
    alias: string
  }

  type Recipe = {
    type: string
    ingredients: string
    name: string
    item_category: string
    item_set: string
    item_type: string
    level: string
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
    'action/add_character': {
      sui_character: SuiCharacter & { skin?: string }
      three_character: ThreeEntity
    }
    'action/add_visible_character': FullCharacter
    'action/remove_visible_character': string
    'action/remove_character': string
    'action/register_wallet': Wallet
    'action/select_wallet': string
    'action/select_address': string
    'action/sui_data_update': {
      balance?: bigint
      characters?: SuiCharacter[]
      items?: SuiItem[]
      items_for_sale?: SuiItem[]
      admin_caps?: string[]
      tokens?: SuiToken[]
    }
    'action/sui_add_item': SuiItem
    'action/sui_add_item_for_sale': {
      item: Item | SuiCharacter
      list_price: bigint
    }
    'action/sui_create_character': SuiCharacter
    'action/sui_delete_character': string
    'action/add_finished_craft': { id: string; template: string }
    'action/add_recipe': Recipe
    'action/sui_remove_item': string
    'action/sui_remove_item_for_sale': {
      item?: Item
      character_id?: string
      keep: boolean
    }
    'action/sui_remove_finished_craft': string
    'action/sui_update_item': SuiItem
    'action/sui_equip_item': {
      slot: string
      item: SuiItem
      character_id: string
    }
    'action/sui_unequip_item': {
      character_id: string
      slot: string
    }
    'action/set_online': boolean
    'action/character_action': { id: string; action: string }
    'action/join_fight': { character_id: string; fight_id: string }
    'action/character_update': Partial<SuiCharacter> & { id: string }
  } & Packets

  type Events = import('@aresrpg/aresrpg-protocol/types').TypedEmitter<
    {
      STATE_UPDATED: State // the game state has been updated
      MOVE_MENU_CAMERA: [number, number, number] // move the camera of the menu screen
      CONNECT_TO_SERVER: void // request ws connection to the server
      SET_TIME: number // set the time of the day
      SKY_CYCLE_PAUSED: boolean // pause/resume the normal running of time
      SKY_CYCLE_CHANGED: { value: number; fromUi: boolean } // the daytime has changed
      DISPLAY_DAMAGE_UI: {
        target_object: import('three').Vector3Like
        text: string
        color: string
        is_critical: boolean
      } // display a floating damage text
      SIGNATURE_NOT_VERIFIED: void // the signature was not verified
      RECONNECT_TO_SERVER: void // triggered when clicking on the reconnect button
      USER_LOGOUT: void // triggered when the user logs out
      FORCE_RENDER_CHUNKS: any[] // render the chunks
    } & Packets &
      Actions
  >

  type Action = {
    [K in keyof Actions]: { type: K; payload: Actions[K] }
  }[keyof Actions]
}
