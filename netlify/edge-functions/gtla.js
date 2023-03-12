import handlerify from "../src/handlerify.js"
import gtla from "../src/core/gtla.js"

export default handlerify(gtla, { secure: true })
export const config = { path: "/gtla" }
