const database = new Map();

export default {
  async push(key, value) {
    return database.set(key, value);
  },
  async pull(key) {
    return database.get(key);
  },
  async delete(key) {
    return database.delete(key);
  },
  async increment(key, property) {
    database.get(key)[property]++;
  },
  async is_already_linked(id) {
    return [...database.values()].some(({ discord }) => discord?.id === id);
  },
  async count() {
    return database.size;
  },
};
