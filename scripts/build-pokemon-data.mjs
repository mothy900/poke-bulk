import fs from "node:fs/promises";

const SOURCES = {
  stats: "https://pogoapi.net/api/v1/pokemon_stats.json",
  released: "https://pogoapi.net/api/v1/released_pokemon.json",
  en: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json",
  ko: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ko.json",
};

const SUPPORTED_FORMS = new Set([
  "NORMAL",
  "ALOLA",
  "GALARIAN",
  "HISUIAN",
  "PALDEA",
  "PALDEA_AQUA",
  "PALDEA_BLAZE",
  "PALDEA_COMBAT",
]);

const FORM_PREFIX = {
  NORMAL: { en: "", ko: "" },
  ALOLA: { en: "Alolan ", ko: "알로라 " },
  GALARIAN: { en: "Galarian ", ko: "가라르 " },
  HISUIAN: { en: "Hisuian ", ko: "히스이 " },
  PALDEA: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_AQUA: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_BLAZE: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_COMBAT: { en: "Paldean ", ko: "팔데아 " },
};

const FORM_SUFFIX_EN = {
  PALDEA_AQUA: " (Aqua)",
  PALDEA_BLAZE: " (Blaze)",
  PALDEA_COMBAT: " (Combat)",
};

const FORM_SUFFIX_KO = {
  PALDEA_AQUA: " (아쿠아)",
  PALDEA_BLAZE: " (블레이즈)",
  PALDEA_COMBAT: " (컴뱃)",
};

const POKEAPI_SPECIES_BASE = "https://pokeapi.co/api/v2/pokemon-species/";

const FORM_SUFFIX_SLUG = {
  NORMAL: "",
  ALOLA: "alola",
  GALARIAN: "galar",
  HISUIAN: "hisui",
  PALDEA: "paldea",
  PALDEA_AQUA: "paldea-aqua",
  PALDEA_BLAZE: "paldea-blaze",
  PALDEA_COMBAT: "paldea-combat",
};

function normalizeFormSlugSuffix(formCode) {
  if (!formCode) return "";
  const upper = formCode.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(FORM_SUFFIX_SLUG, upper)) {
    return FORM_SUFFIX_SLUG[upper] ?? "";
  }
  const lowered = upper.toLowerCase();
  if (!lowered || lowered === "normal") return "";
  return lowered.replace(/_+/g, "-");
}

function extractIdFromPokemonUrl(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
}

function pickVarietyForForm(speciesDetail, formCode) {
  if (!speciesDetail) return null;
  const varieties = Array.isArray(speciesDetail.varieties)
    ? speciesDetail.varieties
    : [];
  if (varieties.length === 0) {
    return null;
  }

  if (!formCode || formCode === "NORMAL") {
    return varieties.find((item) => item.is_default) ?? varieties[0];
  }

  const suffix = normalizeFormSlugSuffix(formCode);
  if (!suffix) {
    return varieties.find((item) => item.is_default) ?? varieties[0];
  }

  const normalizedSuffix = '-' + suffix;
  const primary = varieties.find((item) =>
    item?.pokemon?.name?.endsWith(normalizedSuffix)
  );
  if (primary) {
    return primary;
  }
  const loose = varieties.find((item) =>
    item?.pokemon?.name?.includes(suffix)
  );
  return loose ?? varieties.find((item) => item.is_default) ?? varieties[0];
}

function normalizeForm(raw) {
  if (!raw) return "NORMAL";
  const upper = raw.trim().toUpperCase();
  if (upper === "NORMAL" || upper === "FEMALE" || upper === "MALE") {
    return "NORMAL";
  }
  return upper.replace(/[^A-Z0-9]+/g, "_");
}

function isSupportedForm(form) {
  return SUPPORTED_FORMS.has(form);
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json();
}

function nameFromList(list, id) {
  return list[id - 1] ?? null;
}

function normalizeAlias(value) {
  return value.trim().toLowerCase();
}

function cleanSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}

function englishDisplay(baseName, formCode) {
  const prefix = FORM_PREFIX[formCode]?.en ?? "";
  const suffix = FORM_SUFFIX_EN[formCode] ?? "";
  if (!prefix && !suffix) return baseName;
  return cleanSpaces(`${prefix}${baseName}${suffix}`);
}

function koreanDisplay(baseNameKo, formCode, fallbackEn) {
  const prefix = FORM_PREFIX[formCode]?.ko ?? "";
  const suffix = FORM_SUFFIX_KO[formCode] ?? "";
  const base = baseNameKo ?? fallbackEn;
  if (!prefix && !suffix) return base;
  return cleanSpaces(`${prefix}${base}${suffix}`);
}

function addAlias(map, aliasSet, alias, pointer) {
  const normalized = normalizeAlias(alias);
  if (!normalized) return;
  if (!map.has(normalized)) {
    map.set(normalized, { ref: pointer, display: alias });
  }
  aliasSet.add(alias);
}

function addEnglishVariants(map, aliasSet, baseName, formCode, pointer) {
  const english = englishDisplay(baseName, formCode);
  addAlias(map, aliasSet, english, pointer);
  if (english.includes("(") && english.includes(")")) {
    const withoutParens = english.replace(/\s*\([^)]*\)/g, "").trim();
    if (withoutParens && withoutParens !== english) {
      addAlias(map, aliasSet, withoutParens, pointer);
    }
  }
  if (formCode === "NORMAL") {
    addAlias(map, aliasSet, baseName, pointer);
  }
}

function addKoreanVariants(map, aliasSet, baseNameKo, baseNameEn, formCode, pointer) {
  const korean = koreanDisplay(baseNameKo, formCode, baseNameEn);
  addAlias(map, aliasSet, korean, pointer);
  if (formCode === "NORMAL" && baseNameKo) {
    addAlias(map, aliasSet, baseNameKo, pointer);
  }
}

try {
  const [statsData, released, enList, koList] = await Promise.all([
    getJSON(SOURCES.stats),
    getJSON(SOURCES.released),
    getJSON(SOURCES.en),
    getJSON(SOURCES.ko),
  ]);

  const releasedIds = new Set(Object.keys(released).map(Number));

  const speciesMeta = {};
  const nameIndexMap = new Map();
  const seenPointers = new Set();

  const candidateIds = new Set();
  for (const entry of statsData) {
    const dexId = entry.pokemon_id;
    if (!releasedIds.has(dexId)) continue;
    const formCode = normalizeForm(entry.form);
    if (!isSupportedForm(formCode)) continue;
    candidateIds.add(dexId);
  }

  const speciesDetailEntries = await Promise.all(
    Array.from(candidateIds).map(async (dexId) => {
      try {
        const detail = await getJSON(`${POKEAPI_SPECIES_BASE}${dexId}/`);
        return [dexId, detail];
      } catch (error) {
        console.warn(`Failed to fetch species detail for ${dexId}:`, error.message ?? error);
        return [dexId, null];
      }
    })
  );
  const speciesDetails = new Map(speciesDetailEntries);

  for (const entry of statsData) {
    const id = entry.pokemon_id;
    if (!releasedIds.has(id)) continue;

    const formCode = normalizeForm(entry.form);
    if (!isSupportedForm(formCode)) continue;

    const pointer = `${id}__${formCode}`;
    if (seenPointers.has(pointer)) continue;
    seenPointers.add(pointer);

    const baseEnglish = entry.pokemon_name;
    const baseKorean = nameFromList(koList, id);

    const speciesDetail = speciesDetails.get(id) ?? null;
    const chosenVariety = pickVarietyForForm(speciesDetail, formCode);
    const formSlug = chosenVariety?.pokemon?.name ?? null;
    const formId = extractIdFromPokemonUrl(chosenVariety?.pokemon?.url ?? null) ?? id;
    const aliases = new Set();
    addEnglishVariants(nameIndexMap, aliases, baseEnglish, formCode, pointer);
    addKoreanVariants(
      nameIndexMap,
      aliases,
      baseKorean,
      baseEnglish,
      formCode,
      pointer
    );

    speciesMeta[pointer] = {
      id,
      form: formCode,
      formId,
      formSlug,
      names: {
        en: englishDisplay(baseEnglish, formCode),
        ko: koreanDisplay(baseKorean, formCode, baseEnglish),
      },
      aliases: Array.from(aliases),
      stats: {
        attack: entry.base_attack,
        defense: entry.base_defense,
        stamina: entry.base_stamina,
      },
    };
  }

  const nameIndex = Object.fromEntries(
    Array.from(nameIndexMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  );

  const speciesMetaOrdered = Object.fromEntries(
    Object.keys(speciesMeta)
      .sort((a, b) => {
        const [idA, formA] = a.split("__");
        const [idB, formB] = b.split("__");
        const diff = Number(idA) - Number(idB);
        if (diff !== 0) return diff;
        return formA.localeCompare(formB);
      })
      .map((key) => [key, speciesMeta[key]])
  );

  await fs.mkdir("src/data/pokemon", { recursive: true });
  await fs.writeFile(
    "src/data/pokemon/name-index.json",
    JSON.stringify(nameIndex, null, 2),
    "utf8"
  );
  await fs.writeFile(
    "src/data/pokemon/species-meta.json",
    JSON.stringify(speciesMetaOrdered, null, 2),
    "utf8"
  );

  console.log(
    `Generated ${Object.keys(speciesMetaOrdered).length} species entries and ${Object.keys(nameIndex).length} aliases.`
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
