import handlerify from "../src/handlerify.js"

export default handlerify(async (_, { Token }) => {
  Token.rm()
})
export const config = { path: "/logout" }
