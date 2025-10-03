// scripts/build-stats.mjs
import fs from "node:fs/promises";
import path from "node:path";

const GM_URL =
  "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";
const EN_URL =
  "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json";
const KO_URL =
  "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ko.json";

const OUT_JSON = "public/data/baseStats.json";
const OUT_META = "public/data/meta.json";
const OUT_INDEX = "public/data/nameIndex.json";

// Default form priority order (from Python script)
const DEFAULT_FORMS_ORDER = [
  "NORMAL",
  "STANDARD",
  "INCARNATE",
  "ORDINARY",
  "ARIA",
  "OVERCAST",
  "AVERAGE",
];

function normalizeForm(form) {
  if (!form) return "NORMAL";
  let f = String(form).toUpperCase();

  // Form normalization mapping
  const repl = {
    ALOLAN: "ALOLA",
    GALARIAN: "GALAR",
    HISUIAN: "HISUI",
    ORDINARY: "ORDINARY",
    INCARNATE: "INCARNATE",
    ARIA: "ARIA",
    STANDARD: "STANDARD",
    THERIAN: "THERIAN",
    SPEED: "SPEED",
    MEGA: "MEGA",
    MEGA_X: "MEGA_X",
    MEGA_Y: "MEGA_Y",
    OVERCAST: "OVERCAST",
    SUNNY: "SUNNY",
    RAINCLOUD: "RAINCLOUD",
    SNOWCLOUD: "SNOWCLOUD",
    SMALL: "SMALL",
    AVERAGE: "AVERAGE",
    LARGE: "LARGE",
    SUPER: "SUPER",
  };

  f = f.replace("FORM_", "").replace("FORM", "").replace("__", "_").trim();
  return repl[f] || f;
}

function extractStats(stats) {
  if (!stats) return null;
  const atk = stats.base_attack ?? stats.baseAttack;
  const def = stats.base_defense ?? stats.baseDefense;
  const sta = stats.base_stamina ?? stats.baseStamina;
  if ([atk, def, sta].some((v) => v == null)) return null;
  return { attack: atk, defense: def, hp: sta };
}

function hasEvolution(ps) {
  const branches = ps.evolution_branch ?? ps.evolutionBranch;
  if (Array.isArray(branches) && branches.length > 0) return true;

  const evolutions = ps.evolutions;
  if (Array.isArray(evolutions) && evolutions.length > 0) return true;

  const evolutionIds = ps.evolution_ids ?? ps.evolutionIds;
  if (Array.isArray(evolutionIds) && evolutionIds.length > 0) return true;

  return false;
}

function nameFromList(langList, dexId) {
  if (1 <= dexId && dexId <= langList.length) {
    return langList[dexId - 1];
  }
  return null;
}

function chooseDefaultPtrs(fullMap) {
  const byId = {};
  for (const [ptr, v] of Object.entries(fullMap)) {
    const dex = v.id;
    const form = v.form || "NORMAL";
    if (!byId[dex]) byId[dex] = [];
    byId[dex].push([ptr, form]);
  }

  const chosen = {};
  for (const [dex, lst] of Object.entries(byId)) {
    let ptr = null;
    for (const pref of DEFAULT_FORMS_ORDER) {
      const found = lst.filter(([p, f]) => f === pref);
      if (found.length > 0) {
        ptr = found[0][0];
        break;
      }
    }
    if (!ptr) {
      ptr = lst[0][0];
    }
    chosen[dex] = ptr;
  }
  return chosen;
}

function buildNameIndex(fullMap, lowercaseKeys = true) {
  const chosenPtr = chooseDefaultPtrs(fullMap);
  const idToNames = {};

  for (const [ptr, v] of Object.entries(fullMap)) {
    const dex = v.id;
    if (!idToNames[dex]) {
      const names = v.names || {};
      idToNames[dex] = [names.en || "", names.ko || ""];
    }
  }

  const idx = {};
  for (const [dex, ptr] of Object.entries(chosenPtr)) {
    const [en, ko] = idToNames[dex] || ["", ""];
    for (const name of [en, ko]) {
      if (!name) continue;
      const key = lowercaseKeys ? name.toLowerCase() : name;
      if (!idx[key]) {
        idx[key] = { ref: ptr, display: name };
      }
    }
  }
  return idx;
}

async function fetchJson(url) {
  console.log(`[fetch] GET ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "pvp-bulk-builder/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();
  console.log(
    `[fetch] ${url} -> ${
      Array.isArray(data)
        ? `array with ${data.length} items`
        : `object with ${Object.keys(data).length} keys`
    }`
  );
  return data;
}

const nowIso = new Date().toISOString();

// Fetch all data
const [gm, enList, koList] = await Promise.all([
  fetchJson(GM_URL),
  fetchJson(EN_URL),
  fetchJson(KO_URL),
]);

// Process Game Master data
const byId = {};
for (const t of gm) {
  const data = t.data ?? t;
  const ps = data.pokemon_settings ?? data.pokemonSettings;
  if (!ps) continue;

  // Extract dex ID from template_id or pokedex_number
  let dex = null;
  const templateId = t.template_id ?? t.templateId ?? "";
  const match = templateId.match(/^V(\d{4,})_POKEMON/);
  if (match) {
    dex = parseInt(match[1]);
  }
  if (dex === null) {
    const pokedexNumber = ps.pokedex_number ?? ps.pokedexNumber;
    if (typeof pokedexNumber === "number") {
      dex = pokedexNumber;
    }
  }
  if (dex === null) continue;

  const stats = extractStats(ps.stats ?? ps.baseStats);
  if (!stats) continue;

  const form = normalizeForm(ps.form ?? ps.form_value ?? ps.formValue);
  const entry = {
    dex,
    form,
    stats,
    hasEvolution: hasEvolution(ps),
  };

  if (!byId[dex]) byId[dex] = [];
  byId[dex].push(entry);
}

// Build full mapping
const fullMap = {};
for (const [dexStr, forms] of Object.entries(byId)) {
  const dex = parseInt(dexStr);
  const enName = nameFromList(enList, dex) || "";
  const koName = nameFromList(koList, dex) || "";
  const aliases = [enName, koName].filter(Boolean).sort();

  const speciesHasEvo = forms.some((e) => e.hasEvolution);

  // Choose best form based on priority
  let chosen = null;
  for (const pref of DEFAULT_FORMS_ORDER) {
    chosen = forms.find((e) => e.form === pref);
    if (chosen) break;
  }
  if (!chosen) {
    chosen = forms.find((e) => e.stats) || forms[0];
  }

  const form = chosen.form || "NORMAL";
  const key = `${dex}__${form}`;

  fullMap[key] = {
    id: dex,
    form,
    names: { en: enName, ko: koName },
    aliases,
    stats: chosen.stats,
    hasEvolution: speciesHasEvo,
  };
}

// Build name index
const nameIndex = buildNameIndex(fullMap, true);

// Write files
await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
await fs.writeFile(OUT_JSON, JSON.stringify(fullMap, null, 2));
await fs.writeFile(OUT_INDEX, JSON.stringify(nameIndex, null, 2));
await fs.writeFile(
  OUT_META,
  JSON.stringify(
    {
      source: "PokeMiners Game Master + Pokemon Names",
      gmUrl: GM_URL,
      enUrl: EN_URL,
      koUrl: KO_URL,
      generatedAt: nowIso,
      speciesCount: Object.keys(fullMap).length,
      nameIndexCount: Object.keys(nameIndex).length,
    },
    null,
    2
  )
);

console.log(`[ok] Generated ${Object.keys(fullMap).length} species entries`);
console.log(
  `[ok] Generated ${Object.keys(nameIndex).length} name index entries`
);
console.log(`[ok] Files written at ${nowIso}`);
