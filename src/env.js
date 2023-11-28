const {
  VITE_AZURE_CLIENT,
  VITE_MICROSOFT_REDIRECT_URI = 'http://localhost:3000/minecraft-oauth',
  VITE_DISCORD_CLIENT_ID,
  VITE_DISCORD_REDIRECT_URI = 'http://localhost:3000/discord-oauth',
  VITE_BASE_API_PATH = 'http://localhost:3001',
} = import.meta.env;

export {
  VITE_AZURE_CLIENT,
  VITE_BASE_API_PATH,
  VITE_DISCORD_CLIENT_ID,
  VITE_DISCORD_REDIRECT_URI,
  VITE_MICROSOFT_REDIRECT_URI,
};
