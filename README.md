# ares-app

## DB requirements

```
FT.CREATE users
  ON JSON
  NOOFFSETS
  NOFREQS
  SCHEMA
    $.username AS username TAG
    $.discord.id AS discord_id TAG
    $.crew3.quests.items[*].amount AS item_amount NUMERIC
    $.crew3.quests.items[*].name AS item_name TEXT
```
