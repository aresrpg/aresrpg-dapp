import handlerify from '../src/handlerify.js';
import { link } from '../src/core/discord.js';

// secure because the user need to login with microsoft first
export default handlerify(link, { secure: true });
export const config = { path: '/discord/link' };
