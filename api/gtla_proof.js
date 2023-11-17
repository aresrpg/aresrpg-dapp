import handlerify from '../src/core/handlerify.js';
import gtla_proof from '../src/core/gtla_proof.js';

export default handlerify(gtla_proof, { captcha: true });
