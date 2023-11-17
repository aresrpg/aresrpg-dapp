import handlerify from './src/handlerify.js';
import me from './src/core/me.js';

export default handlerify(me, { secure: true });
