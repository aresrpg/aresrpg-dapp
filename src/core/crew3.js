import { CREW3_API_KEY } from './env.js';

function fetch_crew3(endpoint, options) {
  return fetch(`https://api.crew3.xyz/communities/aresrpg${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': CREW3_API_KEY,
    },
  })
    .then(result => result.json())
    .catch(error => {
      console.error(error);
      return {};
    });
}

export default {
  async get_user(discord_id) {
    const { level, rank, id } =
      (await fetch_crew3(`/users?discordId=${discord_id}`)) ?? {};
    if (!id) return {};
    return { level, rank, id };
  },
  async get_quests(crew3_id) {
    const { data = [] } =
      (await fetch_crew3(
        `/claimed-quests?user_id=${crew3_id}&status=success`,
      )) ?? {};
    return {
      completed: data.length,
      items: data
        .flatMap(({ reward }) => reward)
        .filter(({ type }) => type === 'other')
        .map(({ value }) => ({
          name: value.trim(),
          amount: 1,
          issuer: 'crew3',
        })),
    };
  },
};
