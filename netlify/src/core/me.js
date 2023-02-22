import database from "../database.js"

import { fetch_user, get_expiration } from "./discord.js"
import Crew3 from "./crew3.js"

const HOUR_1 = 1000 * 60 * 60

function augment_with_amount(inventory) {
  return inventory.map((item) => ({ ...item, amount: 1 }))
    .reduce((result, item) => {
      const existing = result.find(
        (processed_item) => processed_item.name === item.name,
      )
      if (existing) existing.amount++
      else result.push(item)
      return result
    }, [])
}

export default async (_, { uuid }) => {
  const {
    username: minecraft_username = "",
    mastery,
    discord: {
      id,
      username,
      discriminator,
      staff,
      avatar,
      last_update = 0,
      access_token,
      expiration,
      refresh_token,
    } = {},
    crew3: { id: crew3_id, level, rank, quests = {}, completed_quests } = {},
    inventory: last_inventory = [],
  } = (await database.pull(uuid)) ?? {}
  const is_cache_expired = last_update + HOUR_1 < Date.now()

  if (refresh_token) {
    try {
      const discord = is_cache_expired
        ? await fetch_user({ access_token, refresh_token, expiration })
        : { id, username, discriminator, staff, avatar }

      const crew3 = is_cache_expired || !crew3_id
        ? await Crew3.get_user(discord.id)
        : { level, rank, id: crew3_id }

      const crew3_newly_initialized = !crew3_id && crew3.id

      const { completed, items } =
        (is_cache_expired && crew3.id) || crew3_newly_initialized
          ? await Crew3.get_quests(crew3.id)
          : {
            completed: quests?.completed ?? completed_quests ?? 0,
            items: [
              ...quests?.items?.map((item) => ({ issuer: "crew3", ...item })) ??
                [],
              ...last_inventory,
            ].filter(({ issuer }) => issuer === "crew3"),
          }

      const inventory = [
        ...last_inventory.filter(({ issuer }) => issuer !== "crew3"),
        ...items,
      ].flatMap(({ amount, ...item }) => {
        if (amount) return Array.from({ length: amount }).fill(item)
        return item
      })

      const user = {
        username: minecraft_username,
        uuid,
        mastery: crew3.level ?? mastery,
        discord,
        crew3: {
          ...crew3,
          completed_quests: completed,
        },
        inventory,
      }

      // if user was updated, save it
      if (is_cache_expired || !crew3_id) {
        await database.push(uuid, {
          ...user,
          discord: {
            ...user.discord,
            last_update: Date.now(),
            access_token,
            expiration: discord.expires_in
              ? get_expiration(discord.expires_in)
              : expiration,
            refresh_token: discord.refresh_token ?? refresh_token,
          },
        })
      }

      return {
        ...user,
        inventory: augment_with_amount(user.inventory),
      }
    } catch (error) {
      if (error === "INVALID_GRANT") {
        const user = { username: minecraft_username, uuid }
        await database.push(uuid, {
          ...user,
          discord: undefined,
          crew3: undefined,
        })
        return user
      }
      console.error(error)
    }
  }
  return {
    username: minecraft_username,
    uuid,
    inventory: augment_with_amount(last_inventory),
  }
}
