import { CREW3_API_KEY } from "../env.js";

function fetch_crew3(endpoint, options) {
  return fetch(`https://api.crew3.xyz/communities/aresrpg${endpoint}`, {
    ...options,
    headers: {
      "x-api-key": CREW3_API_KEY,
    },
  }).then((result) => result.json());
}

export default {
  async get_user(discord_id) {
    const { level, rank, id } =
      (await fetch_crew3(`/users?discordId=${discord_id}`)) ?? {};
    if (!id) return {};
    return { level, rank, id };
  },
  async get_quests(crew3_id) {
    const { data } = await fetch_crew3(
      `/claimed-quests?user_id=${crew3_id}&status=success`,
    );
    return [
      ...data.map(({ reward }) => reward),
      [{ type: "other", value: "Familier Krinan Le Fourvoyeur" }, {
        type: "other",
        value: "Familier Krinan Le Fourvoyeur",
      }],
      [{ type: "other", value: "Familier Siluri" }],
    ];
  },
};
