import type { PokemonRecord } from "../data/pokemonRegistry";

export function normalizeFormSuffix(form: string): string | null {
  const map: Record<string, string> = {
    ALOLA: "alola",
    GALARIAN: "galar",
    HISUIAN: "hisui",
    PALDEA: "paldea",
    PALDEA_AQUA: "paldea-aqua",
    PALDEA_BLAZE: "paldea-blaze",
    PALDEA_COMBAT: "paldea-combat",
    NORMAL: "",
  };

  if (Object.prototype.hasOwnProperty.call(map, form)) {
    return map[form] || null;
  }

  const lowered = form.toLowerCase();
  if (!lowered) {
    return null;
  }

  return lowered.replace(/_/g, "-");
}

export function getPokemonImageSources(record: PokemonRecord): string[] {
  const candidates: string[] = [];
  const pushCandidate = (url: string | null | undefined) => {
    if (!url) return;
    if (!candidates.includes(url)) {
      candidates.push(url);
    }
  };

  const numericIds: number[] = [];
  const pushId = (value: number | null | undefined) => {
    if (typeof value !== "number") return;
    if (!Number.isFinite(value)) return;
    if (!numericIds.includes(value)) {
      numericIds.push(value);
    }
  };

  pushId(record.formId);
  pushId(record.id);

  const slugCandidates: string[] = [];
  if (
    typeof record.formSlug === "string" &&
    record.formSlug.trim().length > 0
  ) {
    const slug = record.formSlug.trim();
    slugCandidates.push(slug);
    if (slug.includes("-")) {
      const baseSlug = slug.split("-")[0];
      if (baseSlug && baseSlug !== slug) {
        slugCandidates.push(baseSlug);
      }
    }
  }

  for (const slug of slugCandidates) {
    pushCandidate(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" +
        slug +
        ".png"
    );
    pushCandidate(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/" +
        slug +
        ".png"
    );
    pushCandidate(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" +
        slug +
        ".png"
    );
  }

  for (const spriteId of numericIds) {
    pushCandidate(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" +
        spriteId +
        ".png"
    );
    pushCandidate(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/" +
        spriteId +
        ".png"
    );
    pushCandidate(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" +
        spriteId +
        ".png"
    );
  }

  if (record.form !== "NORMAL") {
    const suffix = normalizeFormSuffix(record.form);
    if (suffix) {
      pushCandidate(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" +
          record.id +
          "-" +
          suffix +
          ".png"
      );
      pushCandidate(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/" +
          record.id +
          "-" +
          suffix +
          ".png"
      );
      pushCandidate(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" +
          record.id +
          "-" +
          suffix +
          ".png"
      );
    }
  }

  return candidates;
}
