import { useState, useEffect } from "react";
import { leagues } from "../data/pokemonDataExtended";
import {
  findBestLevelForIV,
  calculateRank,
} from "../utils/pokemonCalculations";
import {
  findPokemonByName,
  getPokemonSuggestions,
  type PokemonRecord,
} from "../data/pokemonRegistry";
import UpdateBar from "../components/UpdateBar";

interface PokemonIV {
  id: number;
  attack: number;
  defense: number;
  hp: number;
  level: number;
  cp?: number;
  rank?: number;
  statProduct?: number;
  rankPosition?: number;
  isOptimal?: boolean;
}

const FLOAT_EPSILON = 1e-6;

interface SpeciesComboCache {
  comboMap: Map<string, { level: number; cp: number; statProduct: number }>;
  rankMap: Map<string, number>;
  maxStatProduct: number;
  optimalKey: string | null;
}

const combosCache = new Map<string, SpeciesComboCache>();

const createIVKey = (attack: number, defense: number, hp: number): string =>
  `${attack}-${defense}-${hp}`;

function getSpeciesCache(
  record: PokemonRecord,
  league: (typeof leagues)[number]
): SpeciesComboCache {
  const cacheKey = `${record.pointer}::${league.maxCP}`;
  const cached = combosCache.get(cacheKey);
  if (cached) return cached;
  const built = buildSpeciesCache(record, league);
  combosCache.set(cacheKey, built);
  return built;
}

function buildSpeciesCache(
  record: PokemonRecord,
  league: (typeof leagues)[number]
): SpeciesComboCache {
  const baseStats = {
    name: record.names.ko || record.names.en,
    attack: record.stats.attack,
    defense: record.stats.defense,
    hp: record.stats.stamina,
  };

  const comboMap = new Map<
    string,
    { level: number; cp: number; statProduct: number }
  >();
  const combos: Array<{
    key: string;
    level: number;
    cp: number;
    statProduct: number;
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

      if (
        statDiff > FLOAT_EPSILON ||
        cpDiff > FLOAT_EPSILON ||
        levelDiff > FLOAT_EPSILON
      ) {
        currentRank = index + 1;
      }
    }

    rankMap.set(combo.key, currentRank);
    if (combo.statProduct > maxStatProduct) {
      maxStatProduct = combo.statProduct;
    }
  });

  const optimalKey = combos[0]?.key ?? null;

  return {
    comboMap,
    rankMap,
    maxStatProduct,
    optimalKey,
  };
}

function recalculateRows(
  rows: PokemonIV[],
  record: PokemonRecord | null,
  league: (typeof leagues)[number]
): PokemonIV[] {
  if (!record) return rows;

  const cache = getSpeciesCache(record, league);
  const fallbackBaseStats = {
    name: record.names.ko || record.names.en,
    attack: record.stats.attack,
    defense: record.stats.defense,
    hp: record.stats.stamina,
  };

  return rows.map((row) => {
    const key = createIVKey(row.attack, row.defense, row.hp);
    const combo = cache.comboMap.get(key);

    if (!combo) {
      const fallback = findBestLevelForIV(fallbackBaseStats, league, {
        attackIV: row.attack,
        defenseIV: row.defense,
        hpIV: row.hp,
      });

      return {
        ...row,
        level: fallback.level,
        cp: fallback.cp,
        statProduct: fallback.statProduct,
        rank: undefined,
        rankPosition: undefined,
        isOptimal: false,
      };
    }

    const rankPercent = calculateRank(combo.statProduct, cache.maxStatProduct);
    const rankPosition = cache.rankMap.get(key);

    return {
      ...row,
      level: combo.level,
      cp: combo.cp,
      statProduct: combo.statProduct,
      rank: rankPercent,
      rankPosition,
      isOptimal: cache.optimalKey === key,
    };
  });
}

function rowsAreEqual(a: PokemonIV[], b: PokemonIV[]): boolean {
  if (a.length !== b.length) return false;

  return a.every((row, index) => {
    const other = b[index];
    if (!other) return false;

    const statProductEqual =
      row.statProduct == null && other.statProduct == null
        ? true
        : row.statProduct != null &&
          other.statProduct != null &&
          Math.abs(row.statProduct - other.statProduct) < FLOAT_EPSILON;

    const rankPercentEqual =
      row.rank == null && other.rank == null
        ? true
        : row.rank != null &&
          other.rank != null &&
          Math.abs(row.rank - other.rank) < FLOAT_EPSILON;

    const rankPositionEqual =
      (row.rankPosition ?? null) === (other.rankPosition ?? null);

    return (
      row.id === other.id &&
      row.attack === other.attack &&
      row.defense === other.defense &&
      row.hp === other.hp &&
      Math.abs((row.level ?? 0) - (other.level ?? 0)) < FLOAT_EPSILON &&
      (row.cp ?? null) === (other.cp ?? null) &&
      statProductEqual &&
      rankPercentEqual &&
      rankPositionEqual &&
      (row.isOptimal ?? false) === (other.isOptimal ?? false)
    );
  });
}

export default function Main() {
  const [pokemonName, setPokemonName] = useState("");
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]);
  const [pokemonIVs, setPokemonIVs] = useState<PokemonIV[]>([
    { id: 1, attack: 0, defense: 0, hp: 0, level: 1 },
  ]);
  const [currentPokemon, setCurrentPokemon] = useState<PokemonRecord | null>(
    null
  );
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!currentPokemon) return;
    setPokemonIVs((prev) => {
      const next = recalculateRows(prev, currentPokemon, selectedLeague);
      return rowsAreEqual(prev, next) ? prev : next;
    });
  }, [currentPokemon, selectedLeague]);

  const addNewRow = () => {
    const newId = Math.max(...pokemonIVs.map((iv) => iv.id)) + 1;
    setPokemonIVs([
      ...pokemonIVs,
      { id: newId, attack: 0, defense: 0, hp: 0, level: 1 },
    ]);
  };

  const removeRow = (id: number) => {
    if (pokemonIVs.length > 1) {
      setPokemonIVs(pokemonIVs.filter((iv) => iv.id !== id));
    }
  };

  const updateIV = (
    id: number,
    field: keyof Omit<PokemonIV, "id">,
    value: number
  ) => {
    setPokemonIVs((prev) => {
      const baseUpdated = prev.map((iv) =>
        iv.id === id ? { ...iv, [field]: value } : iv
      );

      if (
        !currentPokemon ||
        !(field === "attack" || field === "defense" || field === "hp")
      ) {
        return baseUpdated;
      }

      const next = recalculateRows(baseUpdated, currentPokemon, selectedLeague);
      return rowsAreEqual(prev, next) ? prev : next;
    });
  };

  const handlePokemonNameChange = (name: string) => {
    setPokemonName(name);

    const suggestions = name.length > 0 ? getPokemonSuggestions(name, 5) : [];
    setSearchSuggestions(suggestions);
    setShowSuggestions(name.length > 0 && suggestions.length > 0);

    const lookup = findPokemonByName(name);
    setCurrentPokemon(lookup?.record ?? null);
  };

  const selectSuggestion = (suggestion: string) => {
    setPokemonName(suggestion);
    setShowSuggestions(false);
    const lookup = findPokemonByName(suggestion);
    setCurrentPokemon(lookup?.record ?? null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div>
        <UpdateBar />
      </div>
      <div className="max-w-4xl mx-auto">
        {/* 포켓몬 이름 입력 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            포켓몬 IV 계산기
          </h1>
          <div className="max-w-md mx-auto">
            <label
              htmlFor="pokemon-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              포켓몬 이름
            </label>
            <div className="relative">
              <input
                id="pokemon-name"
                type="text"
                value={pokemonName}
                onChange={(e) => handlePokemonNameChange(e.target.value)}
                onFocus={() =>
                  setShowSuggestions(
                    pokemonName.length > 0 && searchSuggestions.length > 0
                  )
                }
                placeholder="예: 피카츄, Charizard, 알로라 모래두지"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 shadow-sm"
              />

              {/* 자동완성 제안 */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {currentPokemon && (
              <div className="mt-2 text-sm text-green-600">
                {currentPokemon.names.ko || currentPokemon.names.en} 발견!
                (공격: {currentPokemon.stats.attack}, 방어:{" "}
                {currentPokemon.stats.defense}, 체력:{" "}
                {currentPokemon.stats.stamina})
              </div>
            )}
          </div>
        </div>

        {/* 포켓몬 정보 표시 */}
        {currentPokemon && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              포켓몬 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">공격</div>
                <div className="text-2xl font-bold text-blue-800">
                  {currentPokemon.stats.attack}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">방어</div>
                <div className="text-2xl font-bold text-green-800">
                  {currentPokemon.stats.defense}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">체력</div>
                <div className="text-2xl font-bold text-red-800">
                  {currentPokemon.stats.stamina}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 리그 선택 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            리그 선택
          </h2>
          <div className="flex gap-4">
            {leagues.map((league) => (
              <button
                key={league.name}
                onClick={() => setSelectedLeague(league)}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                  selectedLeague.name === league.name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {league.name} (CP{" "}
                {league.maxCP === 9999 ? "제한 없음" : league.maxCP})
              </button>
            ))}
          </div>
        </div>

        {/* IV 입력 테이블 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              IV 조합 입력
            </h2>
            <button
              onClick={addNewRow}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <span>+</span> 행 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    포켓몬 이름
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    레벨
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    공격
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    방어
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    체력
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    CP
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    %
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    랭크
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    삭제
                  </th>
                </tr>
              </thead>
              <tbody>
                {pokemonIVs.map((pokemonIV) => (
                  <tr
                    key={pokemonIV.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      pokemonIV.isOptimal ? "bg-green-50 border-green-200" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="text-gray-600">
                        {currentPokemon
                          ? currentPokemon.names.ko || currentPokemon.names.en
                          : pokemonName || "이름 없음"}
                        {pokemonIV.isOptimal && (
                          <span className="ml-2 text-green-600 font-semibold">
                            최적
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {pokemonIV.level
                            ? pokemonIV.level.toFixed(1)
                            : "계산 중..."}
                        </span>
                        <span className="text-xs text-gray-500">
                          (자동계산)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={pokemonIV.attack}
                        onChange={(e) =>
                          updateIV(
                            pokemonIV.id,
                            "attack",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        {Array.from({ length: 16 }, (_, i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={pokemonIV.defense}
                        onChange={(e) =>
                          updateIV(
                            pokemonIV.id,
                            "defense",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        {Array.from({ length: 16 }, (_, i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={pokemonIV.hp}
                        onChange={(e) =>
                          updateIV(pokemonIV.id, "hp", parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        {Array.from({ length: 16 }, (_, i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          pokemonIV.cp && pokemonIV.cp > selectedLeague.maxCP
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {pokemonIV.cp ?? "계산 대기중..."}
                        {pokemonIV.cp &&
                          pokemonIV.cp > selectedLeague.maxCP && (
                            <span className="text-xs text-red-500 block">
                              CP 초과!
                            </span>
                          )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          pokemonIV.rank != null && pokemonIV.rank >= 90
                            ? "text-green-600"
                            : pokemonIV.rank != null && pokemonIV.rank >= 70
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {pokemonIV.rank != null
                          ? `${pokemonIV.rank.toFixed(2)}%`
                          : "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-700">
                        {pokemonIV.rankPosition != null
                          ? `#${pokemonIV.rankPosition}`
                          : "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {pokemonIVs.length > 1 && (
                        <button
                          onClick={() => removeRow(pokemonIV.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors duration-200"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 자동 계산 안내 */}
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              💡 IV를 입력하면 자동으로 리그별 최적 레벨과 CP가 계산됩니다!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
