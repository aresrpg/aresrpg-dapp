import { Transaction, coinWithBalance } from '@mysten/sui/transactions'
import { MIST_PER_SUI } from '@mysten/sui/utils'

import { NETWORK } from '../../env.js'
import { context } from '../game/game.js'

import { execute, sdk, sui_enforce_personal_kiosk } from './client.js'

function get_vaporeon_package_id() {
  const [package_id_raw] = Object.entries(sdk.SUPPORTED_NFTS).find(
    ([, { item_type }]) => item_type === 'vaporeon',
  )

  const [package_id] = package_id_raw.split('::')
  return package_id
}

function vaporeon_registry_id() {
  return NETWORK === 'testnet'
    ? '0x70cfed46e3ae7b4d465ddcdda34edac155cdb070fb05b6b7f31da16fb9f6bd94'
    : '0x73e3db6d08a2ef8d84ff0a61c3b43a416635e64c0170a456f1747a60c71e96af'
}

function vaporeon_transfer_policy() {
  return NETWORK === 'testnet'
    ? '0xe09afd8f6204162b5e612847f5ab34cab8ab78dbeccc374c661cf2e4a647f93f'
    : '0x24a4a87a6127b60d05b79bcbae1f52719c2f4f97956c0692f325773764afc39e'
}

export async function sui_get_vaporeon_mint() {
  const {
    data: {
      content: {
        // @ts-ignore
        fields: { minted },
      },
    },
  } = await sdk.sui_client.getObject({
    id: vaporeon_registry_id(),
    options: { showContent: true },
  })

  return +minted
}

export async function sui_get_vaporeon_mint_keys() {
  const { data } = await sdk.sui_client.getOwnedObjects({
    owner: context.get_state().sui.selected_address,
    filter: {
      StructType: `${get_vaporeon_package_id()}::vaporeon::VaporeonKey`,
    },
  })

  return data.map(({ data: { objectId } }) => objectId)
}

export async function sui_mint_vaporeon(key) {
  const tx = new Transaction()

  const { kiosk_tx, kiosk_id, kiosk_cap } = await sui_enforce_personal_kiosk(tx)

  if (key)
    tx.moveCall({
      target: `${get_vaporeon_package_id()}::vaporeon::mint_with_key`,
      arguments: [
        tx.object(key),
        tx.object(vaporeon_registry_id()),
        typeof kiosk_id === 'string' ? tx.object(kiosk_id) : kiosk_id,
        kiosk_cap,
        tx.object(vaporeon_transfer_policy()),
        tx.object('0x6'),
      ],
    })
  else
    tx.moveCall({
      target: `${get_vaporeon_package_id()}::vaporeon::mint_with_sui`,
      arguments: [
        coinWithBalance({ balance: 60n * MIST_PER_SUI, useGasCoin: true }),
        tx.object(vaporeon_registry_id()),
        typeof kiosk_id === 'string' ? tx.object(kiosk_id) : kiosk_id,
        kiosk_cap,
        tx.object(vaporeon_transfer_policy()),
        tx.object('0x6'),
      ],
    })
  kiosk_tx.finalize()

  return await execute(tx)
}
