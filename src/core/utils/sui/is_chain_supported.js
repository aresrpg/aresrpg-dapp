import {
  VITE_SERVER_MAINNET_URL,
  VITE_SERVER_TESTNET_URL,
} from '../../../env.js'

export function is_chain_supported({ selected_wallet_name, wallets }) {
  const wallet = wallets[selected_wallet_name]
  if (!wallet) return false
  switch (wallet.chain) {
    case 'sui:mainnet':
      return !!VITE_SERVER_MAINNET_URL
    case 'sui:testnet':
      return !!VITE_SERVER_TESTNET_URL
    case 'sui:devnet':
      return false
    default:
      return false
  }
}
