import token from "./token.js"

const Result = {
  success: (result) =>
    new Response(JSON.stringify({ result }), { status: 200 }),
  failure: (failure) => {
    console.error(failure)
    return new Response(
      JSON.stringify({ failure: failure.message ?? failure }),
      { status: 400 },
    )
  },
}

export default (handle, { secure } = {}) => async (request, { cookies }) => {
  const body = await request.json()
  if (!body) return Result.failure("MISSING_BODY")

  const Token = token({
    set_cookies: (name, value, options) =>
      cookies.set({ name, value, ...options }),
    get_cookies: (name) => cookies.get(name),
  })

  const context = {
    ...(await Token.get()),
    Token,
  }

  // if route is meant to be for logged users
  if (secure) {
    const { uuid } = context
    if (!uuid) return Result.failure("UNAUTHORIZED")
  }

  return handle(body, context).then(Result.success).catch(Result.failure)
}
