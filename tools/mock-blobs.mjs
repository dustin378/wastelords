// In-memory stand-in for @netlify/blobs, used only by the local test harness.
const stores = new Map();
export function getStore(opts) {
  const name = typeof opts === "string" ? opts : opts.name;
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  return {
    async get(key, o) {
      const v = m.has(key) ? m.get(key) : null;
      if (v == null) return null;
      return o?.type === "json" ? JSON.parse(v) : v;
    },
    async setJSON(key, value) { m.set(key, JSON.stringify(value)); },
    async set(key, value) { m.set(key, String(value)); },
    async delete(key) { m.delete(key); }
  };
}
