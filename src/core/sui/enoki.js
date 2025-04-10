import { EnokiFlow } from '@mysten/enoki'

import { VITE_ENOKI_KEY, NETWORK } from '../../env.js'
import enoki_logo from '../../assets/sui/google.png?url'

import { sdk } from './client.js'
import { wallet_emitter } from './wallet.js'

const enoki = new EnokiFlow({
  apiKey: VITE_ENOKI_KEY,
})

function enoki_state() {
  return enoki.$zkLoginState.get()
}

export function enoki_address() {
  return enoki_state().address
}

export async function enoki_login() {
  return enoki.handleAuthCallback()
}

export async function enoki_login_url() {
  return await enoki.createAuthorizationURL({
    provider: 'google',
    clientId:
      '263863163058-qn6qhkjmdvmlj8f1n4r0kdi4e608usbo.apps.googleusercontent.com',
    redirectUrl: `${window.location.origin}/enoki`,
    // @ts-ignore
    network: NETWORK,
  })
}

export async function enoki_logout() {
  await enoki.logout()
}

export function enoki_wallet() {
  const { address } = enoki_state()

  return {
    accounts: [
      {
        address,
        publicKey: new Uint8Array(),
        chains: [`sui:${NETWORK}`],
        features: [],
        label: 'Enoki',
      },
    ],
    chain: `sui:${NETWORK}`,
    icon: enoki_logo,
    name: 'Enoki',
    version: '1',
    async connect() {
      window.location.href = await enoki_login_url()
    },
    disconnect() {
      enoki.logout()
      wallet_emitter.emit('switch_wallet', null)
    },
    async signAndExecuteTransaction({ transaction }) {
      await enoki.sponsorAndExecuteTransaction({
        network: NETWORK,
        // @ts-ignore
        client: sdk.sui_client,
        transaction,
      })
    },
    async signPersonalMessage(message) {
      const keypair = await enoki.getKeypair({ network: NETWORK })

      return {
        ...(await keypair.signPersonalMessage(
          new TextEncoder().encode(message),
        )),
      }
    },
    /**
     * @param {object} opt
     * @param {import("@mysten/sui/transactions").Transaction} opt.transaction
     * @param {boolean} opt.sponsored
     */
    async signTransaction({ transaction }) {
      const keypair = await enoki.getKeypair({ network: NETWORK })
      const { bytes, signature } = await keypair.signTransaction(
        await transaction.build({
          client: sdk.sui_client,
        }),
      )

      return { signature, bytes }
    },
  }
}
