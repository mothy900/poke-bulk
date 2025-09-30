// scripts/build-stats.mjs
import fs from "node:fs/promises";

const GM_URL =
  "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json"; // 최신 GM
const OUT_JSON = "public/data/baseStats.json";
const OUT_META = "public/data/meta.json";

function normForm(form) {
  if (!form) return "NORMAL";
  return String(form).toUpperCase();
}
function toId(x) {
  return String(x || "").toLowerCase();
}

function extractStats(stats) {
  if (!stats) return null;
  const atk = stats.base_attack ?? stats.baseAttack;
  const def = stats.base_defense ?? stats.baseDefense;
  const sta = stats.base_stamina ?? stats.baseStamina;
  if ([atk, def, sta].some((v) => v == null)) return null;
  return { atk, def, sta };
}

const nowIso = new Date().toISOString();

const res = await fetch(GM_URL, {
  headers: { "User-Agent": "pvp-bulk-updater" },
});
if (!res.ok) {
  throw new Error("Failed to fetch Game Master: " + res.status);
}
const gm = await res.json();

const out = [];
for (const t of gm) {
  const data = t.data ?? t;
  const ps = data.pokemon_settings ?? data.pokemonSettings;
  if (!ps) continue;

  const stats = extractStats(ps.stats ?? ps.baseStats);
  if (!stats) continue;

  const pid = ps.pokemon_id ?? ps.pokemonId;
  const form = normForm(ps.form ?? ps.form_value ?? ps.formValue);

  // 종ID+폼을 구분해서 저장(폼별 스탯 다름)
  out.push({
    speciesId: toId(pid), // 예: "charizard"
    form, // 예: "CHARIZARD_NORMAL" or "NORMAL"
    ...stats, // atk/def/sta
  });
}

// 중복/가짜 엔트리 정리 & 정렬
const uniq = new Map();
for (const r of out) {
  const key = `${r.speciesId}__${r.form}`;
  if (!uniq.has(key)) uniq.set(key, r);
}
const final = Array.from(uniq.values()).sort(
  (a, b) =>
    a.speciesId.localeCompare(b.speciesId) || a.form.localeCompare(b.form)
);

// 파일 쓰기
await fs.mkdir("public/data", { recursive: true });
await fs.writeFile(OUT_JSON, JSON.stringify(final, null, 2));
await fs.writeFile(
  OUT_META,
  JSON.stringify(
    {
      source: "PokeMiners Game Master",
      url: GM_URL,
      generatedAt: nowIso,
      count: final.length,
    },
    null,
    2
  )
);

console.log(
  `[ok] baseStats.json updated (${final.length} entries) at ${nowIso}`
);
