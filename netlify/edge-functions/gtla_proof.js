import handlerify from "../src/handlerify.js"
import gtla_proof from "../src/core/gtla_proof.js"

export default handlerify(gtla_proof, { captcha: true })
export const config = { path: "/gtla-proof" }
