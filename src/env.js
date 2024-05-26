const {
  VITE_SUI_RPC = 'https://fullnode.testnet.sui.io',
  VITE_SUI_WSS = 'wss://fullnode.testnet.sui.io',
  VITE_SERVER_URL,
  VITE_SPONSOR_URL = 'https://testnet-sponsor.aresrpg.world',
  VITE_INDEXER_URL = 'https://testnet-indexer.aresrpg.world',
  VITE_ENOKI_KEY = 'enoki_public_98a33b011a0542de52088c3f94bfe069',
  VITE_NETWORK = 'testnet',
} = import.meta.env

export const NETWORK = VITE_NETWORK
export {
  VITE_SUI_RPC,
  VITE_SUI_WSS,
  VITE_SERVER_URL,
  VITE_ENOKI_KEY,
  VITE_SPONSOR_URL,
  VITE_INDEXER_URL,
}
