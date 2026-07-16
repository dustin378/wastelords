// Blob-store wrappers. One store, namespaced keys, per-player order keys to avoid write races.
import { getStore } from "@netlify/blobs";

const store = () => getStore({ name: "wastelords", consistency: "strong" });

export async function getIndex() {
  return (await store().get("index", { type: "json" })) || [];
}
export async function addToIndex(code) {
  const idx = await getIndex();
  if (!idx.includes(code)) { idx.push(code); await store().setJSON("index", idx); }
}
export async function getGame(code) {
  return await store().get(`game:${code}`, { type: "json" });
}
export async function putGame(game) {
  await store().setJSON(`game:${game.code}`, game);
}
export async function putOrders(code, turn, pid, payload) {
  await store().setJSON(`orders:${code}:${turn}:${pid}`, payload);
}
export async function getOrders(code, turn, pid) {
  return await store().get(`orders:${code}:${turn}:${pid}`, { type: "json" });
}
export async function getAllOrders(code, turn, playerIds) {
  const out = {};
  await Promise.all(playerIds.map(async (pid) => {
    const rec = await getOrders(code, turn, pid);
    if (rec?.orders) out[pid] = rec.orders;
  }));
  return out;
}
export async function getOutbox(code) {
  return (await store().get(`outbox:${code}`, { type: "json" })) || [];
}
export async function putOutbox(code, items) {
  await store().setJSON(`outbox:${code}`, items);
}
