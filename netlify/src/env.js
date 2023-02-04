import { config } from 'https://deno.land/x/dotenv@v3.2.0/mod.ts';

const {
  PORT: port = 3000,
  PRIVATE_KEY,
  PUBLIC_KEY,
  COOKIE_SAMESITE = 'none',
  COOKIE_PATH = '/',
  COOKIE_SECURE: cookie_secure = 'true',
  COOKIE_DOMAIN,
  REDIS_HOST,
  USE_PERSISTENT_STORAGE: use_persistent_storage = 'false',
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_REDIRECT_URI = 'http://localhost:8888/minecraft-oauth',
  MICROSOFT_TENANT_ID,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI = 'http://localhost:8888/discord-oauth',
} = config();

export const PORT = +port;

export {
  COOKIE_DOMAIN,
  COOKIE_PATH,
  COOKIE_SAMESITE,
  CORS_ORIGIN,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_REDIRECT_URI,
  MICROSOFT_TENANT_ID,
  PRIVATE_KEY,
  PUBLIC_KEY,
  REDIS_HOST,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
};

export const COOKIE_SECURE = cookie_secure === 'true';
export const USE_PERSISTENT_STORAGE = use_persistent_storage === 'true';
