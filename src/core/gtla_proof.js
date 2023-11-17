import database from './database.js';

export default async ({ uuid }) => {
  const { gtla, discord } = (await database.pull(uuid)) ?? {};
  if (gtla && discord) {
    const { username, discriminator } = discord;
    return {
      discord: `${username}#${discriminator}`,
      gtla,
    };
  }

  return null;
};
