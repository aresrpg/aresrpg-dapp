import handlerify from "../src/handlerify.js"
import database from "../src/database.js"

export default handlerify(async () => {
  return {
    registrations: await database.count(),
  }
})

export const config = { path: "/server-info" }
