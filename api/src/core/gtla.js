import players from '../players.json' assert { type: 'json' };
import database from '../database.js';

export default async (_, { uuid }) => {
  const player = players.find(({ uuid: player_uuid }) => player_uuid === uuid);
  const saved_player = await database.pull(uuid);

  await database.push(uuid, {
    ...saved_player,
    gtla: player || false,
  });
  return !!player;
};
