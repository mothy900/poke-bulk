import { useState, useEffect } from "react";
import {
  pokemonBaseStatsExtended as pokemonBaseStats,
  leagues,
} from "../data/pokemonDataExtended";
import {
  findPokemonBaseStats,
  findOptimalIVs,
} from "../utils/pokemonCalculations";
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
  isOptimal?: boolean;
}

export default function Main() {
  const [pokemonName, setPokemonName] = useState("");
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]);
  const [pokemonIVs, setPokemonIVs] = useState<PokemonIV[]>([
    { id: 1, attack: 0, defense: 0, hp: 0, level: 1 },
  ]);
  const [currentPokemonStats, setCurrentPokemonStats] = useState<{
    name: string;
    attack: number;
    defense: number;
    hp: number;
  } | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 포켓몬이나 리그가 변경될 때 자동으로 모든 IV 계산
  useEffect(() => {
    if (currentPokemonStats) {
      const updatedPokemonIVs = pokemonIVs.map((pokemonIV) => {
        const optimalResult = findOptimalIVs(
          currentPokemonStats,
          selectedLeague
        );

        return {
          ...pokemonIV,
          level: optimalResult.level,
          cp: optimalResult.cp,
          statProduct: optimalResult.statProduct,
        };
      });

      setPokemonIVs(updatedPokemonIVs);
    }
  }, [currentPokemonStats, selectedLeague, pokemonIVs]);

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
    const updatedIVs = pokemonIVs.map((iv) =>
      iv.id === id ? { ...iv, [field]: value } : iv
    );
    setPokemonIVs(updatedIVs);

    // IV가 변경되면 자동으로 최적 레벨과 CP 계산
    if (
      currentPokemonStats &&
      (field === "attack" || field === "defense" || field === "hp")
    ) {
      const updatedPokemon = updatedIVs.find((iv) => iv.id === id);
      if (updatedPokemon) {
        const optimalResult = findOptimalIVs(
          currentPokemonStats,
          selectedLeague
        );

        // 최적 레벨과 CP로 업데이트
        setPokemonIVs((prev) =>
          prev.map((iv) =>
            iv.id === id
              ? {
                  ...iv,
                  level: optimalResult.level,
                  cp: optimalResult.cp,
                  statProduct: optimalResult.statProduct,
                }
              : iv
          )
        );
      }
    }
  };

  // 포켓몬 이름 변경 시 기본 스탯 찾기
  const handlePokemonNameChange = (name: string) => {
    setPokemonName(name);

    // 자동완성 제안 생성
    if (name.length > 0) {
      const suggestions = pokemonBaseStats
        .filter((pokemon) =>
          pokemon.name.toLowerCase().includes(name.toLowerCase())
        )
        .map((pokemon) => pokemon.name)
        .slice(0, 5); // 최대 5개 제안
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }

    const stats = findPokemonBaseStats(name, pokemonBaseStats);
    setCurrentPokemonStats(stats);
  };

  // 제안 선택
  const selectSuggestion = (suggestion: string) => {
    setPokemonName(suggestion);
    setShowSuggestions(false);
    const stats = findPokemonBaseStats(suggestion, pokemonBaseStats);
    setCurrentPokemonStats(stats);
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
                onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                placeholder="포켓몬 이름을 입력하세요 (예: 피카츄, 리자몽, 갸라도스, 뮤츠)"
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

            {currentPokemonStats && (
              <div className="mt-2 text-sm text-green-600">
                ✓ {currentPokemonStats.name} 발견! (공격:{" "}
                {currentPokemonStats.attack}, 방어:{" "}
                {currentPokemonStats.defense}, 체력: {currentPokemonStats.hp})
              </div>
            )}
          </div>
        </div>

        {/* 포켓몬 정보 표시 */}
        {currentPokemonStats && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              포켓몬 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">공격력</div>
                <div className="text-2xl font-bold text-blue-800">
                  {currentPokemonStats.attack}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">방어력</div>
                <div className="text-2xl font-bold text-green-800">
                  {currentPokemonStats.defense}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">체력</div>
                <div className="text-2xl font-bold text-red-800">
                  {currentPokemonStats.hp}
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
                {league.maxCP === 9999 ? "무제한" : league.maxCP})
              </button>
            ))}
          </div>
        </div>

        {/* IV 입력 테이블 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              IV 데이터 입력
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
                        {pokemonName || "이름 없음"}
                        {pokemonIV.isOptimal && (
                          <span className="ml-2 text-green-600 font-semibold">
                            ★ 최적
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {pokemonIV.level
                            ? pokemonIV.level.toFixed(1)
                            : "계산중..."}
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
                        {pokemonIV.cp ? pokemonIV.cp : "계산 대기중..."}
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
                          pokemonIV.rank && pokemonIV.rank >= 90
                            ? "text-green-600"
                            : pokemonIV.rank && pokemonIV.rank >= 70
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {pokemonIV.rank ? `${pokemonIV.rank}%` : "-"}
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
