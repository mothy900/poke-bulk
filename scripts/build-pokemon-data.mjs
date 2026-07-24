import fs from "node:fs/promises";

const SOURCES = {
  stats: "https://pogoapi.net/api/v1/pokemon_stats.json",
  released: "https://pogoapi.net/api/v1/released_pokemon.json",
  en: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json",
  ko: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ko.json",
};

const FORM_PREFIX = {
  NORMAL: { en: "", ko: "" },
  ALOLA: { en: "Alolan ", ko: "알로라 " },
  GALARIAN: { en: "Galarian ", ko: "가라르 " },
  HISUIAN: { en: "Hisuian ", ko: "히스이 " },
  PALDEA: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_AQUA: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_BLAZE: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_COMBAT: { en: "Paldean ", ko: "팔데아 " },
  ARTISAN: { en: "", ko: "" },
  COUNTERFEIT: { en: "", ko: "" },
  MASTERPIECE: { en: "", ko: "" },
  UNREMARKABLE: { en: "", ko: "" },
  ANTIQUE: { en: "", ko: "" },
  PHONY: { en: "", ko: "" },
};

const FORM_SUFFIX_EN = {
  PALDEA_AQUA: " (Aqua)",
  PALDEA_BLAZE: " (Blaze)",
  PALDEA_COMBAT: " (Combat)",
  ARTISAN: " (Artisan)",
  COUNTERFEIT: " (Counterfeit)",
  MASTERPIECE: " (Masterpiece)",
  UNREMARKABLE: " (Unremarkable)",
  ANTIQUE: " (Antique)",
  PHONY: " (Phony)",
  CROWNED_SWORD: " (Crowned Sword)",
  CROWNED_SHIELD: " (Crowned Shield)",
  HERO: " (Hero)",
  ATTACK: " (Attack)",
  DEFENSE: " (Defense)",
  SPEED: " (Speed)",
  ALTERED: " (Altered)",
  ORIGIN: " (Origin)",
  INCARNATE: " (Incarnate)",
  THERIAN: " (Therian)",
  BLACK: " (Black)",
  WHITE: " (White)",
  SUNNY: " (Sunny)",
  RAINY: " (Rainy)",
  SNOWY: " (Snowy)",
  DAWN_WINGS: " (Dawn Wings)",
  DUSK_MANE: " (Dusk Mane)",
  ULTRA: " (Ultra)",
  UNBOUND: " (Unbound)",
  CONFINED: " (Confined)",
  SINGLE_STRIKE: " (Single Strike)",
  RAPID_STRIKE: " (Rapid Strike)",
  TEN_PERCENT: " (10% Form)",
  FIFTY_PERCENT: " (50% Form)",
  COMPLETE: " (Complete Form)",
  COMPLETE_TEN_PERCENT: " (10% Form)",
  COMPLETE_FIFTY_PERCENT: " (50% Form)",
  FULL_BELLY: " (Full Belly)",
  HANGRY: " (Hangry)",
  APEX: " (Apex)",
  ULTIMATE: " (Ultimate)",
  ICE_RIDER: " (Ice Rider)",
  SHADOW_RIDER: " (Shadow Rider)",
  FAMILY_OF_THREE: " (Family of Three)",
  FAMILY_OF_FOUR: " (Family of Four)",
  TWO: " (Two-Segment)",
  THREE: " (Three-Segment)",
};

const FORM_SUFFIX_KO = {
  PALDEA_AQUA: " (아쿠아)",
  PALDEA_BLAZE: " (블레이즈)",
  PALDEA_COMBAT: " (컴뱃)",
  ARTISAN: " (진작폼)",
  COUNTERFEIT: " (위작폼)",
  MASTERPIECE: " (진작폼)",
  UNREMARKABLE: " (위작폼)",
  ANTIQUE: " (진작폼)",
  PHONY: " (위작폼)",
  CROWNED_SWORD: " (검왕폼)",
  CROWNED_SHIELD: " (방패폼)",
  HERO: " (역전의 용사)",
  ATTACK: " (어택폼)",
  DEFENSE: " (디펜스폼)",
  SPEED: " (스피드폼)",
  ALTERED: " (어나더폼)",
  ORIGIN: " (오리진폼)",
  INCARNATE: " (화신폼)",
  THERIAN: " (영수폼)",
  BLACK: " (블랙)",
  WHITE: " (화이트)",
  SUNNY: " (태양의 모습)",
  RAINY: " (빗물의 모습)",
  SNOWY: " (설운의 모습)",
  DAWN_WINGS: " (새벽의 날개)",
  DUSK_MANE: " (황혼의 갈기)",
  ULTRA: " (울트라)",
  UNBOUND: " (굴레를 벗어난)",
  CONFINED: " (굴레에 묶인)",
  SINGLE_STRIKE: " (일격의 카타)",
  RAPID_STRIKE: " (연격의 카타)",
  TEN_PERCENT: " (10%폼)",
  FIFTY_PERCENT: " (50%폼)",
  COMPLETE: " (퍼펙트폼)",
  COMPLETE_TEN_PERCENT: " (10%폼)",
  COMPLETE_FIFTY_PERCENT: " (50%폼)",
  FULL_BELLY: " (배부른 모드)",
  HANGRY: " (배고픈 모드)",
  APEX: " (에이펙스)",
  ULTIMATE: " (얼티밋)",
  ICE_RIDER: " (백마 탄 모습)",
  SHADOW_RIDER: " (흑마 탄 모습)",
  FAMILY_OF_THREE: " (3마리 가족)",
  FAMILY_OF_FOUR: " (4마리 가족)",
  TWO: " (두마디 폼)",
  THREE: " (세마디 폼)",
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

const FORCE_INCLUDED_SPECIES_IDS = new Set([854]);

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

const ALIAS_OVERRIDES = {
  "646__BLACK": ["Kyurem", "Black Kyurem", "큐레무", "블랙 큐레무", "큐레무 블랙", "큐레무 (블랙)"],
  "646__WHITE": ["Kyurem", "White Kyurem", "큐레무", "화이트 큐레무", "큐레무 화이트", "큐레무 (화이트)"],
  "888__CROWNED_SWORD": [
    "Zacian",
    "자시안",
    "자시안 검왕",
    "검왕",
    "자시안 (검왕폼)",
    "자시안(검왕폼)",
    "검왕폼",
    "Zacian (Crowned Sword)",
  ],
  "888__HERO": [
    "Zacian",
    "자시안",
    "자시안 역전의 용사",
    "자시안 (역전의 용사)",
    "자시안(역전의 용사)",
    "Zacian (Hero)",
  ],
  "889__CROWNED_SHIELD": [
    "Zamazenta",
    "자마젠타",
    "자마젠타 방패",
    "방패폼",
    "자마젠타 (방패폼)",
    "자마젠타(방패폼)",
    "Zamazenta (Crowned Shield)",
  ],
  "889__HERO": [
    "Zamazenta",
    "자마젠타",
    "자마젠타 역전의 용사",
    "자마젠타 (역전의 용사)",
    "자마젠타(역전의 용사)",
    "Zamazenta (Hero)",
  ],
  "487__ORIGIN": [
    "Giratina",
    "기라티나",
    "기라티나 오리진",
    "오리진",
    "기라티나 (오리진폼)",
    "기라티나(오리진폼)",
    "Giratina (Origin)",
  ],
  "487__ALTERED": [
    "Giratina",
    "기라티나",
    "기라티나 어나더",
    "어나더",
    "기라티나 (어나더폼)",
    "기라티나(어나더폼)",
    "Giratina (Altered)",
  ],
  "386__ATTACK": [
    "Deoxys",
    "테오키스",
    "테오키스 어택",
    "테오키스 (어택폼)",
    "테오키스(어택폼)",
    "Deoxys (Attack)",
  ],
  "386__DEFENSE": [
    "Deoxys",
    "테오키스",
    "테오키스 디펜스",
    "테디",
    "테오키스 (디펜스폼)",
    "테오키스(디펜스폼)",
    "Deoxys (Defense)",
  ],
  "386__SPEED": [
    "Deoxys",
    "테오키스",
    "테오키스 스피드",
    "테오키스 (스피드폼)",
    "테오키스(스피드폼)",
    "Deoxys (Speed)",
  ],
  "892__SINGLE_STRIKE": [
    "Urshifu",
    "우라오스",
    "우라오스 일격",
    "일격",
    "우라오스 (일격의 카타)",
    "우라오스(일격의 카타)",
    "Urshifu (Single Strike)",
  ],
  "892__RAPID_STRIKE": [
    "Urshifu",
    "우라오스",
    "우라오스 연격",
    "연격",
    "우라오스 (연격의 카타)",
    "우라오스(연격의 카타)",
    "Urshifu (Rapid Strike)",
  ],
};

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

  const normalizedSuffix = "-" + suffix;
  const primary = varieties.find((item) =>
    item?.pokemon?.name?.endsWith(normalizedSuffix)
  );
  if (primary) {
    return primary;
  }
  const loose = varieties.find((item) => item?.pokemon?.name?.includes(suffix));
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

const EXCLUDED_FORM_PATTERNS = [
  /SHADOW/,
  /PURIFIED/,
  /^MEGA/,
  /^GIGANTAMAX/,
  /^COPY/,
  /COSTUME/,
  /^SPAWN/,
  /^EVENT/,
  /^ULTRA/,
];

function isSupportedForm(form) {
  if (!form) return true;
  const upper = form.toUpperCase();
  return !EXCLUDED_FORM_PATTERNS.some((regex) => regex.test(upper));
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

function addKoreanVariants(
  map,
  aliasSet,
  baseNameKo,
  baseNameEn,
  formCode,
  pointer
) {
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
  for (const id of FORCE_INCLUDED_SPECIES_IDS) {
    releasedIds.add(id);
  }

  const speciesMeta = {};
  const nameIndexMap = new Map();
  const seenPointers = new Set();

  const candidateIds = new Set();
  for (const entry of statsData) {
    const dexId = entry.pokemon_id;
    // Allow all pokemon present in statsData or releasedIds
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
        console.warn(
          `Failed to fetch species detail for ${dexId}:`,
          error.message ?? error
        );
        return [dexId, null];
      }
    })
  );
  const speciesDetails = new Map(speciesDetailEntries);

  for (const entry of statsData) {
    const id = entry.pokemon_id;
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
    const formId =
      extractIdFromPokemonUrl(chosenVariety?.pokemon?.url ?? null) ?? id;
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
    if (ALIAS_OVERRIDES[pointer]) {
      speciesMeta[pointer].aliases = ALIAS_OVERRIDES[pointer];
    }
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
    `Generated ${Object.keys(speciesMetaOrdered).length} species entries and ${
      Object.keys(nameIndex).length
    } aliases.`
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
