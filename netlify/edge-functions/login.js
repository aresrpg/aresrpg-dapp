import handlerify from "../src/handlerify.js"
import microsoft from "../src/core/microsoft.js"

export default handlerify(microsoft, { captcha: true })
export const config = { path: "/login" }
