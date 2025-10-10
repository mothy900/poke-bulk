import { findBestLevelForIV, calculateRank } from "../utils/pokemonCalculations";
import type { PokemonRecord } from "../data/pokemonRegistry";
import type { League } from "../data/pokemonDataExtended";

export interface RankedCombo {
  key: string;
  attack: number;
  defense: number;
  hp: number;
  level: number;
  cp: number;
  statProduct: number;
  rankPosition: number;
  rankPercent: number;
}

export interface SpeciesComboCache {
  comboMap: Map<string, { level: number; cp: number; statProduct: number }>;
  rankMap: Map<string, number>;
  maxStatProduct: number;
  optimalKey: string | null;
  sortedCombos: RankedCombo[];
}

export const FLOAT_EPSILON = 1e-6;

const combosCache = new Map<string, SpeciesComboCache>();

export const createIVKey = (attack: number, defense: number, hp: number): string =>
  `${attack}-${defense}-${hp}`;

export function getSpeciesCache(
  record: PokemonRecord,
  league: League
): SpeciesComboCache {
  const cacheKey = `${record.pointer}::${league.maxCP}`;
  const cached = combosCache.get(cacheKey);
  if (cached) return cached;
  const built = buildSpeciesCache(record, league);
  combosCache.set(cacheKey, built);
  return built;
}

function buildSpeciesCache(record: PokemonRecord, league: League): SpeciesComboCache {
  const baseStats = {
    name: record.names.ko || record.names.en,
    attack: record.stats.attack,
    defense: record.stats.defense,
    hp: record.stats.stamina,
  };

  const comboMap = new Map<string, { level: number; cp: number; statProduct: number }>();
  const combos: Array<{
    key: string;
    level: number;
    cp: number;
    statProduct: number;
    attack: number;
    defense: number;
    hp: number;
  }> = [];

  for (let attack = 0; attack <= 15; attack++) {
    for (let defense = 0; defense <= 15; defense++) {
      for (let hp = 0; hp <= 15; hp++) {
        const result = findBestLevelForIV(baseStats, league, {
          attackIV: attack,
          defenseIV: defense,
          hpIV: hp,
        });

        if (result.cp > league.maxCP) {
          continue;
        }

        const key = createIVKey(attack, defense, hp);
        comboMap.set(key, {
          level: result.level,
          cp: result.cp,
          statProduct: result.statProduct,
        });
        combos.push({
          key,
          level: result.level,
          cp: result.cp,
          statProduct: result.statProduct,
          attack,
          defense,
          hp,
        });
      }
    }
  }

  if (combos.length === 0) {
    return {
      comboMap,
      rankMap: new Map(),
      maxStatProduct: 0,
      optimalKey: null,
      sortedCombos: [],
    };
  }

  combos.sort((a, b) => {
    const statDiff = b.statProduct - a.statProduct;
    if (Math.abs(statDiff) > FLOAT_EPSILON) {
      return statDiff > 0 ? 1 : -1;
    }

    const cpDiff = b.cp - a.cp;
    if (Math.abs(cpDiff) > FLOAT_EPSILON) {
      return cpDiff > 0 ? 1 : -1;
    }

    const levelDiff = a.level - b.level;
    if (Math.abs(levelDiff) > FLOAT_EPSILON) {
      return levelDiff > 0 ? 1 : -1;
    }

    return 0;
  });

  const rankMap = new Map<string, number>();
  let maxStatProduct = 0;
  let currentRank = 1;

  combos.forEach((combo, index) => {
    if (index > 0) {
      const prev = combos[index - 1];
      const statDiff = Math.abs(prev.statProduct - combo.statProduct);
      const cpDiff = Math.abs(prev.cp - combo.cp);
      const levelDiff = Math.abs(prev.level - combo.level);

      if (statDiff > FLOAT_EPSILON || cpDiff > FLOAT_EPSILON || levelDiff > FLOAT_EPSILON) {
        currentRank = index + 1;
      }
    }

    rankMap.set(combo.key, currentRank);
    if (combo.statProduct > maxStatProduct) {
      maxStatProduct = combo.statProduct;
    }
  });

  const optimalKey = combos[0]?.key ?? null;

  const sortedCombos: RankedCombo[] = combos
    .map((combo) => {
      const rankPosition = rankMap.get(combo.key) ?? Number.MAX_SAFE_INTEGER;
      const rankPercent = calculateRank(combo.statProduct, maxStatProduct);
      return {
        key: combo.key,
        attack: combo.attack,
        defense: combo.defense,
        hp: combo.hp,
        level: combo.level,
        cp: combo.cp,
        statProduct: combo.statProduct,
        rankPosition,
        rankPercent,
      };
    })
    .sort((a, b) => {
      if (a.rankPosition !== b.rankPosition) {
        return a.rankPosition - b.rankPosition;
      }

      const statDiff = b.statProduct - a.statProduct;
      if (Math.abs(statDiff) > FLOAT_EPSILON) {
        return statDiff > 0 ? 1 : -1;
      }

      const cpDiff = b.cp - a.cp;
      if (Math.abs(cpDiff) > FLOAT_EPSILON) {
        return cpDiff > 0 ? 1 : -1;
      }

      return a.level - b.level;
    });

  return {
    comboMap,
    rankMap,
    maxStatProduct,
    optimalKey,
    sortedCombos,
  };
}
