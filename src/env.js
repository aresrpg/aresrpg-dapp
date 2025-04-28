const {
  VITE_SUI_RPC = 'https://fullnode.testnet.sui.io',
  VITE_SERVER_URL,
  VITE_ENOKI_KEY = 'enoki_public_ff89078fe8efa82d3f14732264813b91',
  VITE_NETWORK = 'testnet',
  VITE_DEMO_MODE,
} = import.meta.env

export const NETWORK = VITE_NETWORK
export { VITE_SUI_RPC, VITE_SERVER_URL, VITE_ENOKI_KEY, VITE_DEMO_MODE }
