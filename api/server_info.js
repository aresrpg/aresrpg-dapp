import handlerify from '../src/core/handlerify.js';
import database from '../src/core/database.js';

export default handlerify(async () => {
  return {
    registrations: await database.count(),
  };
});
