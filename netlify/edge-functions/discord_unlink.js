import handlerify from '../src/handlerify.js';
import { unlink } from '../src/core/discord.js';

// secure because the user need to login with microsoft first
export default handlerify(unlink, { secure: true });
export const config = { path: '/discord/unlink' };
