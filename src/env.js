const {
  VITE_SUI_TESTNET_RPC = 'https://rpc.ankr.com/sui_testnet/02fe1fb555dee5f0f895faf43a27d670f3abeeb11a554b5f0ff07fbd84de9201',
  VITE_SUI_TESTNET_WSS = 'wss://rpc.ankr.com/sui_testnet/ws/02fe1fb555dee5f0f895faf43a27d670f3abeeb11a554b5f0ff07fbd84de9201',
  VITE_SERVER_TESTNET_URL = 'http://localhost:3002',

  VITE_SUI_MAINNET_RPC = 'https://rpc.ankr.com/sui/02fe1fb555dee5f0f895faf43a27d670f3abeeb11a554b5f0ff07fbd84de9201',
  VITE_SUI_MAINNET_WSS = 'wss://rpc.ankr.com/sui/ws/02fe1fb555dee5f0f895faf43a27d670f3abeeb11a554b5f0ff07fbd84de9201',
  VITE_SERVER_MAINNET_URL = '',
} = import.meta.env

export {
  VITE_SUI_TESTNET_RPC,
  VITE_SUI_TESTNET_WSS,
  VITE_SUI_MAINNET_RPC,
  VITE_SUI_MAINNET_WSS,
  VITE_SERVER_TESTNET_URL,
  VITE_SERVER_MAINNET_URL,
}
