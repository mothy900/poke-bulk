// src/lib/statsStore.ts
const KEY_DATA = "baseStats:v1";
const KEY_META = "baseStats:meta";

export async function loadBaseStats() {
  const cached = localStorage.getItem(KEY_DATA);
  if (cached) return JSON.parse(cached);
  // 번들 스냅샷 폴백
  const res = await fetch("/data/baseStats.json", { cache: "no-store" });
  return await res.json();
}
export function saveBaseStats(data: any, meta: any) {
  localStorage.setItem(KEY_DATA, JSON.stringify(data));
  localStorage.setItem(KEY_META, JSON.stringify(meta));
}
export function getBaseStatsMeta() {
  const m = localStorage.getItem(KEY_META);
  return m ? JSON.parse(m) : null;
}
