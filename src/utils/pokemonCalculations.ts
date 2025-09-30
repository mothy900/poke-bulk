import type { PokemonBaseStats, League } from "../data/pokemonData";
import { cpMultipliers } from "../data/pokemonDataExtended";

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
// 2) CP 계산 함수 - 최소 10 보정
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

  return Math.max(10, Math.floor(cpRaw)); // ← 최솟값 10 적용
}

// 3) 스탯 제품 계산 - HP만 정수 내림
export function calculateStatProduct(
  baseStats: PokemonBaseStats,
  level: number,
  attackIV: number,
  defenseIV: number,
  hpIV: number
): number {
  const cpm = getCPMultiplier(level);

  const atk = (baseStats.attack + attackIV) * cpm; // 실수 유지
  const def = (baseStats.defense + defenseIV) * cpm; // 실수 유지
  const hp = Math.floor((baseStats.hp + hpIV) * cpm); // ← HP만 내림

  return atk * def * hp;
}

export function getCPMultiplier(level: number): number {
  // 0.5 단위로 반올림 정규화 (부동소수 오차 방지)
  const L = Math.round(level * 2) / 2; // ex) 34.499999 -> 34.5
  // 키는 문자열/숫자 혼재 가능하므로 2가지 방식으로 조회
  const keyStr: string = L.toFixed(1); // "34.5"
  const v = cpMultipliers[keyStr as unknown as number] ?? cpMultipliers[L];
  if (v == null) {
    throw new Error(`Unknown CPM for level=${level} (normalized=${keyStr})`);
  }
  return v;
}

// 4) 최적 IV 조합 찾기 - 레벨 루프를 정수 인덱스 기반으로
export function findOptimalIVs(
  baseStats: PokemonBaseStats,
  league: League,
  opts?: { maxLevel?: number } // ex) 40/50/51(베프)
): {
  attackIV: number;
  defenseIV: number;
  hpIV: number;
  level: number;
  cp: number;
  statProduct: number;
} {
  const maxLevel = opts?.maxLevel ?? 51; // 베프 포함 기본 51 권장
  let bestStatProduct = 0;
  let best = {
    attackIV: 0,
    defenseIV: 0,
    hpIV: 0,
    level: 1,
    cp: 0,
    statProduct: 0,
  };

  // 레벨을 "0.5 단위 정수 인덱스"로 순회 (부동소수 오차 방지)
  const maxIdx = Math.round(maxLevel * 2);
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let s = 0; s <= 15; s++) {
        for (let idx = 2; idx <= maxIdx; idx++) {
          // 2→1.0레벨
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
// 랭크 계산 (1-100, 100이 최고)
export function calculateRank(
  statProduct: number,
  maxStatProduct: number
): number {
  if (maxStatProduct === 0) return 0;
  return Math.round((statProduct / maxStatProduct) * 100);
}

// 포켓몬 이름으로 기본 스탯 찾기
export function findPokemonBaseStats(
  name: string,
  pokemonList: PokemonBaseStats[]
): PokemonBaseStats | null {
  return (
    pokemonList.find((pokemon) =>
      pokemon.name.toLowerCase().includes(name.toLowerCase())
    ) || null
  );
}
