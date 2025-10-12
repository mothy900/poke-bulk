import nameIndexRaw from "./pokemon/name-index.json";
import speciesMetaRaw from "./pokemon/species-meta.json";

export interface SpeciesStats {
  attack: number;
  defense: number;
  stamina: number;
}

export interface SpeciesNames {
  en: string;
  ko: string;
}

export interface SpeciesMetaRecord {
  id: number;
  form: string;
  names: SpeciesNames;
  aliases: string[];
  stats: SpeciesStats;
}

export interface NameIndexEntry {
  ref: string;
  display: string;
}

const speciesMeta = speciesMetaRaw as Record<string, SpeciesMetaRecord>;
const nameIndex = nameIndexRaw as Record<string, NameIndexEntry>;

export interface PokemonRecord extends SpeciesMetaRecord {
  pointer: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export const allPokemonRecords: PokemonRecord[] = Object.entries(speciesMeta)
  .map(([pointer, record]) => ({ pointer, ...record }))
  .sort((a, b) => (a.id === b.id ? a.form.localeCompare(b.form) : a.id - b.id));

const aliasEntries = Object.entries(nameIndex).map(([alias, entry]) => ({
  alias,
  ref: entry.ref,
  display: entry.display,
}));

const recordsByDexId = new Map<number, PokemonRecord[]>();
for (const record of allPokemonRecords) {
  const existing = recordsByDexId.get(record.id);
  if (existing) {
    existing.push(record);
  } else {
    recordsByDexId.set(record.id, [record]);
  }
}

const defaultSuggestions = Array.from(
  new Map(
    allPokemonRecords
      .slice(0, 20)
      .map((record) => [record.names.ko || record.names.en, record.names.ko || record.names.en])
  ).values()
);

export function findPokemonByName(
  query: string
): { pointer: string; display: string; record: PokemonRecord } | null {
  const normalized = normalizeName(query);
  if (!normalized) return null;
  const entry = nameIndex[normalized];
  if (!entry) return null;
  const record = speciesMeta[entry.ref];
  if (!record) return null;
  return {
    pointer: entry.ref,
    display: entry.display,
    record: { pointer: entry.ref, ...record },
  };
}

export function getPokemonSuggestions(query: string, limit = 5): string[] {
  const normalized = normalizeName(query);
  const seen = new Set<string>();
  const suggestions: string[] = [];

  if (normalized) {
    for (const { alias, display } of aliasEntries) {
      if (!alias.includes(normalized)) continue;
      if (!seen.has(display)) {
        seen.add(display);
        suggestions.push(display);
        if (suggestions.length >= limit) return suggestions;
      }
    }
  }

  for (const suggestion of defaultSuggestions) {
    if (!seen.has(suggestion)) {
      seen.add(suggestion);
      suggestions.push(suggestion);
      if (suggestions.length >= limit) break;
    }
  }

  return suggestions;
}

export function getPokemonByPointer(pointer: string): PokemonRecord | null {
  const record = speciesMeta[pointer];
  if (!record) return null;
  return { pointer, ...record };
}

export function getPokemonFamilyByDexId(dexId: number): PokemonRecord[] {
  return recordsByDexId.get(dexId) ?? [];
}

export function findPreferredPokemonByDexId(
  dexId: number,
  preferredForm?: string
): PokemonRecord | null {
  const family = getPokemonFamilyByDexId(dexId);
  if (family.length === 0) {
    return null;
  }

  if (preferredForm) {
    const matchedForm = family.find((record) => record.form === preferredForm);
    if (matchedForm) {
      return matchedForm;
    }
  }

  const normalForm = family.find((record) => record.form === "NORMAL");
  return normalForm ?? family[0];
}
