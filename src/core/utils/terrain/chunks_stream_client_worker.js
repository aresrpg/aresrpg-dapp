/**
 * Chunks stream service client to request and handle
 * chunks data received from server
 */
import { chunksStreamClientWorkerSetup } from '@aresrpg/aresrpg-world'

import { format_chunk_data } from './world_utils.js'
const WS_URL = 'ws://localhost:3000'

// used to adapt chunk data to engine format before forwarding to client
const chunk_data_adapter = chunk_stub =>
  format_chunk_data(chunk_stub.metadata, chunk_stub.rawdata, { encode: true })

const { wsInitState } = chunksStreamClientWorkerSetup(
  WS_URL,
  chunk_data_adapter,
)

wsInitState.then(() =>
  console.log(`chunks stream client service listening on ${WS_URL} `),
)

wsInitState.catch(() =>
  console.warn(`chunks stream client failed to start on ${WS_URL} `),
)
