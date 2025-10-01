import fs from "node:fs/promises";

interface StatEntry {
  base_attack: number;
  base_defense: number;
  base_stamina: number;
  form?: string | null;
  pokemon_id: number;
  pokemon_name: string;
}

interface ReleasedEntry {
  id: number;
  name: string;
}

type ReleasedResponse = Record<string, ReleasedEntry>;
type NameList = string[];

type FormCode =
  | "NORMAL"
  | "ALOLA"
  | "GALARIAN"
  | "HISUIAN"
  | "PALDEA"
  | "PALDEA_AQUA"
  | "PALDEA_BLAZE"
  | "PALDEA_COMBAT";

const SOURCES = {
  stats: "https://pogoapi.net/api/v1/pokemon_stats.json",
  released: "https://pogoapi.net/api/v1/released_pokemon.json",
  ko: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ko.json",
} as const;

const SUPPORTED_FORMS = new Set<FormCode>([
  "NORMAL",
  "ALOLA",
  "GALARIAN",
  "HISUIAN",
  "PALDEA",
  "PALDEA_AQUA",
  "PALDEA_BLAZE",
  "PALDEA_COMBAT",
]);

const FORM_PREFIX: Record<FormCode, { en: string; ko: string }> = {
  NORMAL: { en: "", ko: "" },
  ALOLA: { en: "Alolan ", ko: "알로라 " },
  GALARIAN: { en: "Galarian ", ko: "가라르 " },
  HISUIAN: { en: "Hisuian ", ko: "히스이 " },
  PALDEA: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_AQUA: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_BLAZE: { en: "Paldean ", ko: "팔데아 " },
  PALDEA_COMBAT: { en: "Paldean ", ko: "팔데아 " },
};

const FORM_SUFFIX_EN: Partial<Record<FormCode, string>> = {
  PALDEA_AQUA: " (Aqua)",
  PALDEA_BLAZE: " (Blaze)",
  PALDEA_COMBAT: " (Combat)",
};

const FORM_SUFFIX_KO: Partial<Record<FormCode, string>> = {
  PALDEA_AQUA: " (아쿠아)",
  PALDEA_BLAZE: " (블레이즈)",
  PALDEA_COMBAT: " (컴뱃)",
};

function normalizeForm(raw: string | null | undefined): FormCode {
  if (!raw) return "NORMAL";
  const upper = raw.trim().toUpperCase();
  if (upper === "NORMAL" || upper === "FEMALE" || upper === "MALE") {
    return "NORMAL";
  }
  const normalized = upper.replace(/[^A-Z0-9]+/g, "_");
  return SUPPORTED_FORMS.has(normalized as FormCode)
    ? (normalized as FormCode)
    : "NORMAL";
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return (await res.json()) as T;
}

function nameFromList(list: NameList, id: number): string | null {
  return list[id - 1] ?? null;
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

function cleanSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function englishDisplay(baseName: string, formCode: FormCode): string {
  const prefix = FORM_PREFIX[formCode]?.en ?? "";
  const suffix = FORM_SUFFIX_EN[formCode] ?? "";
  if (!prefix && !suffix) return baseName;
  return cleanSpaces(`${prefix}${baseName}${suffix}`);
}

function koreanDisplay(
  baseNameKo: string | null,
  formCode: FormCode,
  fallbackEn: string
): string {
  const prefix = FORM_PREFIX[formCode]?.ko ?? "";
  const suffix = FORM_SUFFIX_KO[formCode] ?? "";
  const base = baseNameKo ?? fallbackEn;
  if (!prefix && !suffix) return base;
  return cleanSpaces(`${prefix}${base}${suffix}`);
}

function addAlias(
  map: Map<string, { ref: string; display: string }>,
  aliasSet: Set<string>,
  alias: string,
  pointer: string
) {
  const normalized = normalizeAlias(alias);
  if (!normalized) return;
  if (!map.has(normalized)) {
    map.set(normalized, { ref: pointer, display: alias });
  }
  aliasSet.add(alias);
}

(async () => {
  try {
    const [statsData, released, koList] = await Promise.all([
      getJSON<StatEntry[]>(SOURCES.stats),
      getJSON<ReleasedResponse>(SOURCES.released),
      getJSON<NameList>(SOURCES.ko),
    ]);

    const releasedIds = new Set<number>(
      Object.keys(released).map((key) => Number.parseInt(key, 10))
    );

    const speciesMeta: Record<
      string,
      {
        id: number;
        form: FormCode;
        names: { en: string; ko: string };
        aliases: string[];
        stats: { attack: number; defense: number; stamina: number };
      }
    > = {};

    const nameIndexMap = new Map<string, { ref: string; display: string }>();
    const seenPointers = new Set<string>();

    for (const entry of statsData) {
      const id = entry.pokemon_id;
      if (!releasedIds.has(id)) continue;

      const formCode = normalizeForm(entry.form);
      if (!SUPPORTED_FORMS.has(formCode)) continue;

      const pointer = `${id}__${formCode}`;
      if (seenPointers.has(pointer)) continue;
      seenPointers.add(pointer);

      const baseEnglish = entry.pokemon_name;
      const baseKorean = nameFromList(koList, id);

      const aliases = new Set<string>();
      const displayEn = englishDisplay(baseEnglish, formCode);
      const displayKo = koreanDisplay(baseKorean, formCode, baseEnglish);

      addAlias(nameIndexMap, aliases, displayEn, pointer);
      addAlias(nameIndexMap, aliases, displayKo, pointer);

      if (formCode === "NORMAL") {
        addAlias(nameIndexMap, aliases, baseEnglish, pointer);
        if (baseKorean) addAlias(nameIndexMap, aliases, baseKorean, pointer);
      }

      speciesMeta[pointer] = {
        id,
        form: formCode,
        names: {
          en: displayEn,
          ko: displayKo,
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
      Array.from(nameIndexMap.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
      )
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
      `Generated ${
        Object.keys(speciesMetaOrdered).length
      } species entries and ${Object.keys(nameIndex).length} aliases.`
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
