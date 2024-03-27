import {
  VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
} from '../../../env.js'

export function is_chain_supported({ selected_wallet_name, wallets }) {
  const wallet = wallets[selected_wallet_name]
  if (!wallet) return false
  switch (wallet.chain) {
    case 'sui:mainnet':
      return !!VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL
    case 'sui:testnet':
      return !!VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL
    case 'sui:devnet':
      return false
    default:
      return true
  }
}
