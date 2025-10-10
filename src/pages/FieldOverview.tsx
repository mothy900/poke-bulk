import { Fragment, useMemo, useState } from "react";
import { leagues } from "../data/pokemonDataExtended";
import {
  currentFieldPokemon,
  type FieldPokemonEntry,
  type FieldSource,
} from "../data/fieldPokemon";
import {
  getPokemonByPointer,
  type PokemonRecord,
} from "../data/pokemonRegistry";
import { getSpeciesCache } from "../lib/speciesRankingCache";

interface FieldDisplayEntry {
  entry: FieldPokemonEntry;
  record: PokemonRecord;
  displayName: string;
}

const SOURCE_LABELS: Record<FieldSource, string> = {
  event: "이벤트",
  season: "시즌",
  nest: "둥지",
  raid: "레이드",
};

const SOURCE_STYLES: Record<FieldSource, string> = {
  event: "bg-pink-100 text-pink-700",
  season: "bg-indigo-100 text-indigo-700",
  nest: "bg-green-100 text-green-700",
  raid: "bg-orange-100 text-orange-700",
};

const DISPLAY_LEAGUES = leagues.slice(0, 2);

export default function FieldOverview() {
  const [activePointer, setActivePointer] = useState<string | null>(null);

  const entries = useMemo<FieldDisplayEntry[]>(() => {
    return currentFieldPokemon
      .map((entry) => {
        const record = getPokemonByPointer(entry.pointer);
        if (!record) return null;
        const displayName = record.names.ko || record.names.en;
        return { entry, record, displayName };
      })
      .filter((value): value is FieldDisplayEntry => value != null);
  }, []);

  const toggleActive = (pointer: string) => {
    setActivePointer((prev) => (prev === pointer ? null : pointer));
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            현장 포켓몬 PvP 랭킹 뷰
          </h2>
          <p className="text-gray-600 max-w-3xl">
            PoGoAPI, PvPoke 데이터를 기반으로 현재 필드에서 등장 가능성이 있는
            포켓몬을 모아 슈퍼/하이퍼리그 상위 10개체를 한 번에 확인할 수
            있어요. 카드를 눌러 랭킹을 펼쳐보세요.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
            아직 등록된 필드 포켓몬이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {entries.map((item) => {
              const isActive = activePointer === item.record.pointer;
              return (
                <Fragment key={item.record.pointer}>
                  <button
                    type="button"
                    onClick={() => toggleActive(item.record.pointer)}
                    className={`bg-white rounded-xl shadow-md transition-all duration-200 text-left p-5 flex flex-col gap-4 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {item.displayName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item.record.names.en}
                        </p>
                      </div>
                      <img
                        src={item.entry.imageUrl}
                        alt={`${item.displayName} artwork`}
                        className="w-20 h-20 object-contain drop-shadow"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.entry.sources.map((source) => (
                        <span
                          key={source}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${SOURCE_STYLES[source]}`}
                        >
                          {SOURCE_LABELS[source]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>상세 랭킹 {isActive ? "숨기기" : "보기"}</span>
                      <span>{isActive ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isActive && (
                    <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 bg-white rounded-xl shadow-lg p-6">
                      <div className="flex flex-col gap-8">
                        {DISPLAY_LEAGUES.map((league) => {
                          const cache = getSpeciesCache(item.record, league);
                          const combos = cache.sortedCombos.slice(0, 10);

                          return (
                            <div key={`${item.record.pointer}-${league.maxCP}`}>
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {league.name} 상위 10개체
                                </h3>
                                <span className="text-sm text-gray-500">
                                  최대 CP {league.maxCP.toLocaleString()}
                                </span>
                              </div>
                              {combos.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                  랭킹 데이터를 찾을 수 없습니다.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200 text-left text-gray-600">
                                        <th className="py-2 px-3">순위</th>
                                        <th className="py-2 px-3">IV</th>
                                        <th className="py-2 px-3">레벨</th>
                                        <th className="py-2 px-3">CP</th>
                                        <th className="py-2 px-3">스탯%</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {combos.map((combo) => (
                                        <tr
                                          key={combo.key}
                                          className="border-b border-gray-100 last:border-0"
                                        >
                                          <td className="py-2 px-3 font-semibold text-gray-700">
                                            #{combo.rankPosition}
                                          </td>
                                          <td className="py-2 px-3 text-gray-700">
                                            {combo.attack}/{combo.defense}/
                                            {combo.hp}
                                          </td>
                                          <td className="py-2 px-3 text-gray-700">
                                            {combo.level.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-3 text-gray-700">
                                            {combo.cp}
                                          </td>
                                          <td className="py-2 px-3 text-gray-700">
                                            {combo.rankPercent.toFixed(2)}%
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
