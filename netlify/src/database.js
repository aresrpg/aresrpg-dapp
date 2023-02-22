import { connect } from "https://deno.land/x/redis@v0.29.0/mod.ts"

import { REDIS_HOST, REDIS_PORT, REDIS_PWD } from "./env.js"

console.log("Connecting to redis..")

const client = await connect({
  hostname: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PWD,
})

function send_command(...cmd) {
  return client
    .sendCommand(...cmd)
    .then((reply) => reply.value())
    .catch(console.error)
}

export default {
  async push(key, value) {
    await send_command("JSON.SET", key, ".", JSON.stringify(value))
  },
  async pull(key) {
    try {
      return JSON.parse(await send_command("JSON.GET", key))
    } catch {
      return {}
    }
  },
  async delete(key) {
    await send_command("JSON.DEL", key)
  },
  async is_already_linked({ uuid, discord_id }) {
    const [, found_uuid] = await send_command(
      "FT.SEARCH",
      "users",
      `@discord_id:{${discord_id}}`,
      "NOCONTENT",
    )
    return found_uuid && found_uuid !== uuid
  },
  async count() {
    const { num_docs } = await send_command("FT.INFO", "users").then((result) =>
      result.reduce((object, value, index) => {
        if (index % 2) return object
        return {
          ...object,
          [value]: result[index + 1],
        }
      }, {})
    )
    return +num_docs
  },
}
