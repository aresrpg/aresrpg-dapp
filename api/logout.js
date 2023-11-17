import handlerify from './src/handlerify.js';

export default handlerify(async (_, { Token }) => {
  Token.rm();
  return true;
});
