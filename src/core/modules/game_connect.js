import toast from '../../toast'

/** @type {Type.Module} */
export default function () {
  return {
    name: 'game_connect',
    observe({ events, connect_ws }) {
      events.on('CONNECT_TO_SERVER', () => {
        connect_ws().catch(error => {
          console.error(error)
        })
      })

      events.on('packet/connectionSuccess', () => {
        toast.success('Successfully connected to AresRPG', 'Socket')
      })

      events.on('packet/joinGame', () => {
        // const { game_state } = get_state()
        // send_packet('packet/joinGameReady', {})
      })
    },
  }
}
