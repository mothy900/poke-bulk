#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const configPath = resolve(__dirname, "field-sources.json");
const outputPath = resolve(__dirname, "../src/data/fieldPokemon.ts");

const nameIndex = require("../src/data/pokemon/name-index.json");
const speciesMeta = require("../src/data/pokemon/species-meta.json");

const SOURCE_ORDER = ["event", "season", "nest", "raid"];

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

function escapeLiteral(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\"')
    .replace(/\n/g, "\\n");
}


function pointerToImage(pointer) {
  const meta = speciesMeta[pointer];
  if (!meta) return null;
  const id = meta.id;
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function pointerToDisplay(pointer) {
  const meta = speciesMeta[pointer];
  if (!meta) return pointer;
  return meta.names?.ko || meta.names?.en || pointer;
}

function coerceEntry(raw, source) {
  if (typeof raw === "string") {
    return { name: raw, source };
  }

  if (raw && typeof raw === "object") {
    const { name, pointer, imageUrl, notes } = raw;
    if (!name && !pointer) {
      throw new Error(`Config entry is missing name/pointer for source ${source}`);
    }
    return { name, pointer, imageUrl, notes, source };
  }

  throw new Error(`Unsupported config entry for source ${source}: ${JSON.stringify(raw)}`);
}

async function main() {
  console.log(`🔍 Loading field sources from ${configPath}`);
  const configRaw = JSON.parse(await readFile(configPath, "utf-8"));
  console.log("📦 Loaded sources:", JSON.stringify(configRaw, null, 2));

  const aggregated = new Map();

  for (const [source, entries] of Object.entries(configRaw)) {
    if (!Array.isArray(entries)) {
      console.warn(`⚠️  ${source} 항목이 배열이 아닙니다. 건너뜁니다.`, entries);
      continue;
    }

    console.log(`
▶️  Source [${source}] - ${entries.length} entries`);
    for (const rawEntry of entries) {
      console.log(`  • Raw entry:`, JSON.stringify(rawEntry));
      const entry = coerceEntry(rawEntry, source);
      const pointer = entry.pointer ?? resolvePointer(entry.name ?? "");
      if (!pointer) {
        console.warn(`   ⚠️  포인터를 찾을 수 없습니다: ${entry.name} (${source})`);
        continue;
      }

      const meta = speciesMeta[pointer];
      if (!meta) {
        console.warn(`   ⚠️  species-meta에서 레코드를 찾을 수 없습니다: ${pointer}`);
        continue;
      }

      const existing = aggregated.get(pointer) ?? {
        pointer,
        imageUrl: entry.imageUrl ?? pointerToImage(pointer) ?? "",
        sources: [],
        notes: entry.notes,
        sortName: pointerToDisplay(pointer),
      };

      if (entry.notes && !existing.notes) {
        existing.notes = entry.notes;
      }

      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
        existing.sources.sort(
          (a, b) => SOURCE_ORDER.indexOf(a) - SOURCE_ORDER.indexOf(b)
        );
      }

      aggregated.set(pointer, existing);
      console.log(`    → Resolved pointer ${pointer} (${existing.sortName})`);
      console.log(`      Current sources: ${existing.sources.join(', ')}`);
      if (existing.notes) {
        console.log(`      Notes: ${existing.notes}`);
      }
    }
  }

  const entries = Array.from(aggregated.values())
    .sort((a, b) => a.sortName.localeCompare(b.sortName, "ko"))
    .map(({ sortName, ...rest }) => rest);

  console.log(`
📊 Aggregated ${entries.length} unique species`);
  console.log('📄 Aggregated payload:', JSON.stringify(entries, null, 2));

  const lines = entries.map((entry) => {
    const { pointer, imageUrl, sources, notes } = entry;
    const sourcesLiteral = `[${sources.map((s) => `"${s}"`).join(", ")}]`;
    const fields = [
      `    pointer: "${escapeLiteral(pointer)}",`,
      `    imageUrl: "${escapeLiteral(imageUrl)}",`,
      `    sources: ${sourcesLiteral},`,
    ];
    if (notes) {
      fields.push(`    notes: "${escapeLiteral(notes)}",`);
    }
    return `  {
${fields.join("\n")}
  }`;
  });

  const output = `/**
 * 이 파일은 scripts/generateFieldPokemon.mjs 스크립트로 생성되었습니다.
 * 데이터를 수정하려면 scripts/field-sources.json 을 편집한 뒤
 * \`npm run generate:field\` 를 실행하세요.
 */
export type FieldSource = "event" | "season" | "nest" | "raid";

export interface FieldPokemonEntry {
  pointer: string;
  imageUrl: string;
  sources: FieldSource[];
  notes?: string;
}

export const currentFieldPokemon: FieldPokemonEntry[] = [
${lines.join(",\n")}
];
`;

  await writeFile(outputPath, output, "utf-8");
  console.log(`✅ Generated ${entries.length} field Pokémon entries at ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Failed to generate field pokemon list");
  console.error(error);
  process.exitCode = 1;
});
