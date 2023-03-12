import handlerify from "../src/handlerify.js"
import microsoft from "../src/core/microsoft.js"

export default handlerify(microsoft)
export const config = { path: "/login" }
