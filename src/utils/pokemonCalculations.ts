import type { PokemonBaseStats, League } from "../data/pokemonData";
import { cpMultipliers } from "../data/pokemonDataExtended";
import { LEVEL_TYPE } from "../types/enum";

export interface PokemonData {
  name: string;
  level: number;
  attackIV: number;
  defenseIV: number;
  hpIV: number;
  cp?: number;
  rank?: number;
  statProduct?: number;
}

export interface CalculationResult {
  cp: number;
  statProduct: number;
  rank: number;
  isOptimal: boolean;
}
// 2) CP 怨꾩궛 ?⑥닔 - 理쒖냼 10 蹂댁젙
export function calculateCP(
  baseStats: PokemonBaseStats,
  level: number,
  attackIV: number,
  defenseIV: number,
  hpIV: number
): number {
  const cpm = getCPMultiplier(level);
  const atk = baseStats.attack + attackIV;
  const def = baseStats.defense + defenseIV;
  const sta = baseStats.hp + hpIV;

  const cpRaw = (atk * Math.sqrt(def) * Math.sqrt(sta) * (cpm * cpm)) / 10;

  return Math.max(10, Math.floor(cpRaw)); // ??理쒖넖媛?10 ?곸슜
}

// 3) ?ㅽ꺈 ?쒗뭹 怨꾩궛 - HP留??뺤닔 ?대┝
export function calculateStatProduct(
  baseStats: PokemonBaseStats,
  level: number,
  attackIV: number,
  defenseIV: number,
  hpIV: number
): number {
  const cpm = getCPMultiplier(level);

  const atk = (baseStats.attack + attackIV) * cpm; // ?ㅼ닔 ?좎?
  const def = (baseStats.defense + defenseIV) * cpm; // ?ㅼ닔 ?좎?
  const hp = Math.floor((baseStats.hp + hpIV) * cpm); // ??HP留??대┝

  return atk * def * hp;
}

export function getCPMultiplier(level: number): number {
  const normalizedLevel = Math.round(level * 2) / 2;
  const keyWithFixed = normalizedLevel.toFixed(1);
  const candidateKeys = [
    keyWithFixed,
    normalizedLevel.toString(),
    Number(normalizedLevel).toString(),
  ];

  for (const key of candidateKeys) {
    const value = cpMultipliers[key];
    if (value != null) {
      return value;
    }
  }

  throw new Error(
    `Unknown CPM for level=${level} (normalized=${keyWithFixed})`
  );
}

// 4) 理쒖쟻 IV 議고빀 李얘린 - ?덈꺼 猷⑦봽瑜??뺤닔 ?몃뜳??湲곕컲?쇰줈
export function findOptimalIVs(
  baseStats: PokemonBaseStats,
  league: League,
  opts?: { maxLevel?: number } // ex) 40/50/51(踰좏봽)
): {
  attackIV: number;
  defenseIV: number;
  hpIV: number;
  level: number;
  cp: number;
  statProduct: number;
} {
  const maxLevel = opts?.maxLevel ?? LEVEL_TYPE.MAX_XL_LEVEL; // 踰좏봽 ?ы븿 湲곕낯 51 沅뚯옣
  let bestStatProduct = 0;
  let best = {
    attackIV: 0,
    defenseIV: 0,
    hpIV: 0,
    level: 1,
    cp: 0,
    statProduct: 0,
  };

  // ?덈꺼??"0.5 ?⑥쐞 ?뺤닔 ?몃뜳??濡??쒗쉶 (遺?숈냼???ㅼ감 諛⑹?)
  const maxIdx = Math.round(maxLevel * 2);
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let s = 0; s <= 15; s++) {
        for (let idx = 2; idx <= maxIdx; idx++) {
          // 2??.0?덈꺼
          const lvl = idx / 2;
          const cp = calculateCP(baseStats, lvl, a, d, s);
          if (cp > league.maxCP) continue;

          const sp = calculateStatProduct(baseStats, lvl, a, d, s);
          if (sp > bestStatProduct) {
            bestStatProduct = sp;
            best = {
              attackIV: a,
              defenseIV: d,
              hpIV: s,
              level: lvl,
              cp,
              statProduct: sp,
            };
          }
        }
      }
    }
  }
  return best;
}
// 怨좎젙 IV 議고빀?먯꽌 由ш렇 理쒕? CP ?댄븯 理쒖쟻 ?덈꺼 李얘린
export function findBestLevelForIV(
  baseStats: PokemonBaseStats,
  league: League,
  ivs: { attackIV: number; defenseIV: number; hpIV: number },
  opts?: { maxLevel?: number }
): { level: number; cp: number; statProduct: number } {
  const maxLevel = opts?.maxLevel ?? LEVEL_TYPE.MAX_XL_LEVEL;
  const maxIdx = Math.round(maxLevel * 2);
  let best: { level: number; cp: number; statProduct: number } | null = null;

  for (let idx = 2; idx <= maxIdx; idx++) {
    const level = idx / 2;
    const cp = calculateCP(
      baseStats,
      level,
      ivs.attackIV,
      ivs.defenseIV,
      ivs.hpIV
    );
    const statProduct = calculateStatProduct(
      baseStats,
      level,
      ivs.attackIV,
      ivs.defenseIV,
      ivs.hpIV
    );

    if (cp > league.maxCP) {
      if (!best) {
        best = { level, cp, statProduct };
      }
      break;
    }

    best = { level, cp, statProduct };
  }

  if (!best) {
    throw new Error("Unable to determine best level for IV combination");
  }

  return best;
}

// ??겕 怨꾩궛 (1-100, 100??理쒓퀬)
export function calculateRank(
  statProduct: number,
  maxStatProduct: number
): number {
  if (maxStatProduct === 0) return 0;
  const percentage = (statProduct / maxStatProduct) * 100;
  return Math.max(0, Math.min(100, percentage));
}

// ?ъ폆紐??대쫫?쇰줈 湲곕낯 ?ㅽ꺈 李얘린
export function findPokemonBaseStats(
  name: string,
  list: PokemonBaseStats[]
): PokemonBaseStats | null {
  const q = name.trim().toLowerCase();
  // 1) ?꾩쟾 ?쇱튂 ?곗꽑
  const exact = list.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;
  // 2) ?묐몢 ?곗꽑
  const prefix = list.find((p) => p.name.toLowerCase().startsWith(q));
  if (prefix) return prefix;
  // 3) 洹????ы븿
  return list.find((p) => p.name.toLowerCase().includes(q)) || null;
}
