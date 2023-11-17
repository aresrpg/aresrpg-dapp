import handlerify from '../src/core/handlerify.js';

export default handlerify(async (_, { Token }) => {
  Token.rm();
  return true;
});
