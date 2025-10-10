#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const SOURCE_ORDER = ["event", "season", "nest", "raid"];
const API_ENDPOINTS = {
  nest: "https://pogoapi.net/api/v1/nesting_pokemon.json",
  raid: "https://pogoapi.net/api/v1/raid_bosses.json",
};

const configPath = resolve(__dirname, "field-sources.json");
const nameIndex = require("../src/data/pokemon/name-index.json");
const speciesMeta = require("../src/data/pokemon/species-meta.json");

function normalize(value) {
  return value.trim().toLowerCase();
}

function resolvePointer(name) {
  const normalized = normalize(name);
  const entry = nameIndex[normalized];
  if (entry) {
    return entry.ref;
  }

  for (const [pointer, meta] of Object.entries(speciesMeta)) {
    const { names } = meta;
    if (!names) continue;
    const { en, ko } = names;
    if (en && normalize(en) === normalized) return pointer;
    if (ko && normalize(ko) === normalized) return pointer;
  }

  return null;
}

function pointerToDisplay(pointer) {
  const meta = speciesMeta[pointer];
  if (!meta) return pointer;
  return meta.names?.ko || meta.names?.en || pointer;
}

function prepareBaseMaps(config) {
  const result = {
    aggregated: new Map(),
    baseNotes: new Map(),
    unresolved: new Map(),
  };

  for (const source of SOURCE_ORDER) {
    result.unresolved.set(source, []);
  }

  for (const [source, entries] of Object.entries(config)) {
    const typed = SOURCE_ORDER.includes(source) ? source : null;
    if (!typed) continue;
    if (!Array.isArray(entries)) continue;

    for (const rawEntry of entries) {
      let name = null;
      let pointer = null;
      let notes = undefined;

      if (typeof rawEntry === "string") {
        name = rawEntry;
      } else if (rawEntry && typeof rawEntry === "object") {
        if (rawEntry.pointer) {
          pointer = rawEntry.pointer;
        }
        if (rawEntry.name) {
          name = rawEntry.name;
        }
        if (rawEntry.notes) {
          notes = rawEntry.notes;
        }
      }

      if (!pointer && name) {
        pointer = resolvePointer(name);
      }

      if (pointer) {
        const displayName = pointerToDisplay(pointer);
        const existing = result.aggregated.get(pointer) ?? {
          pointer,
          displayName,
          sources: new Map(),
        };
        existing.sources.set(typed, notes);
        result.aggregated.set(pointer, existing);
      } else {
        result.unresolved.get(typed)?.push(rawEntry);
      }
    }
  }

  return result;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "pvp-bulk-build-script/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (status ${response.status})`);
  }
  return response.json();
}

function formatName(baseName, form) {
  if (!form) return baseName;
  const trimmed = String(form).trim();
  if (!trimmed || trimmed.toLowerCase() === "normal") return baseName;
  if (/mega/i.test(trimmed) && !trimmed.toLowerCase().startsWith("mega")) {
    return `${trimmed} ${baseName}`;
  }
  if (baseName.toLowerCase().includes(trimmed.toLowerCase())) {
    return baseName;
  }
  return `${baseName} (${trimmed})`;
}

function extractNamesFromEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return [];
  }
  const names = [];
  const name = entry.pokemon_name || entry.pokemon || entry.name || entry.species;
  const form = entry.form || entry.pokemon_form || entry.variant;
  const pokemonId = entry.pokemon_id || entry.id;
  if (pokemonId && !name) {
    const found = Object.values(speciesMeta).find((meta) => meta.id === Number(pokemonId));
    if (found?.names?.en) {
      names.push({ name: found.names.en, form: form ?? found.form ?? null });
      return names;
    }
  }
  if (name) {
    names.push({ name, form: form ?? null });
  }
  return names;
}

function flattenEntries(data) {
  const collected = [];
  if (Array.isArray(data)) {
    for (const entry of data) {
      if (typeof entry === "string") {
        collected.push({ name: entry });
      } else {
        collected.push(...extractNamesFromEntry(entry));
      }
    }
    return collected;
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      collected.push(...flattenEntries(value));
    }
  }

  return collected;
}

async function fetchNestNames() {
  try {
    const json = await fetchJson(API_ENDPOINTS.nest);
    const entries = flattenEntries(json);
    return entries.map(({ name, form }) => formatName(name, form));
  } catch (error) {
    console.warn(`⚠️  Failed to fetch nesting data: ${error.message}`);
    return [];
  }
}

async function fetchRaidNames() {
  try {
    const json = await fetchJson(API_ENDPOINTS.raid);
    const current = json?.current ?? json?.tiers ?? json;
    const entries = flattenEntries(current);
    return entries.map(({ name, form }) => formatName(name, form));
  } catch (error) {
    console.warn(`⚠️  Failed to fetch raid data: ${error.message}`);
    return [];
  }
}

function addEntriesFromNames(names, source, aggregated, unresolved) {
  for (const rawName of names) {
    if (!rawName) continue;
    const pointer = resolvePointer(rawName);
    if (!pointer) {
      unresolved.get(source)?.push(rawName);
      console.warn(`   ⚠️  Unable to resolve pointer for ${rawName} (${source})`);
      continue;
    }

    const displayName = pointerToDisplay(pointer);
    const existing = aggregated.get(pointer) ?? {
      pointer,
      displayName,
      sources: new Map(),
    };
    if (!existing.sources.has(source)) {
      existing.sources.set(source, undefined);
    }
    aggregated.set(pointer, existing);
  }
}

function buildConfig(aggregated, unresolved) {
  const result = {};
  for (const source of SOURCE_ORDER) {
    const entries = [];
    const relevant = Array.from(aggregated.values())
      .filter((entry) => entry.sources.has(source))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

    for (const entry of relevant) {
      const notes = entry.sources.get(source);
      if (notes) {
        entries.push({ pointer: entry.pointer, name: entry.displayName, notes });
      } else {
        entries.push({ pointer: entry.pointer, name: entry.displayName });
      }
    }

    const unresolvedEntries = unresolved.get(source) ?? [];
    for (const item of unresolvedEntries) {
      entries.push(item);
    }

    result[source] = entries;
  }
  return result;
}

async function main() {
  console.log(`🔍 Loading base configuration from ${configPath}`);
  const baseConfig = JSON.parse(await readFile(configPath, "utf-8"));
  const { aggregated, unresolved } = prepareBaseMaps(baseConfig);

  console.log("📥 Fetching external data...");
  const [nestNames, raidNames] = await Promise.all([
    fetchNestNames(),
    fetchRaidNames(),
  ]);

  console.log(`⚙️  Applying ${nestNames.length} nesting entries`);
  addEntriesFromNames(nestNames, "nest", aggregated, unresolved);

  console.log(`⚙️  Applying ${raidNames.length} raid entries`);
  addEntriesFromNames(raidNames, "raid", aggregated, unresolved);

  const updatedConfig = buildConfig(aggregated, unresolved);

  await writeFile(configPath, `${JSON.stringify(updatedConfig, null, 2)}
`, "utf-8");
  console.log(`✅ Updated ${configPath}`);
}

main().catch((error) => {
  console.error("❌ Failed to update field sources");
  console.error(error);
  process.exitCode = 1;
});
