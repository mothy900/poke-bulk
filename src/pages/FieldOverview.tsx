import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { leagues } from "../data/pokemonDataExtended";
import {
  currentFieldPokemon,
  type FieldPokemonEntry,
  type FieldSource,
} from "../data/fieldPokemon";
import {
  getPokemonByPointer,
  getPokemonFamilyByDexId,
  findPreferredPokemonByDexId,
  type PokemonRecord,
} from "../data/pokemonRegistry";

import { getSpeciesCache } from "../lib/speciesRankingCache";
import { getPokemonImageSources } from "../utils/pokemonImg";
import { fetchEvolutionChain } from "../utils/evolutionChains";

interface FieldDisplayEntry {
  entry: FieldPokemonEntry;
  record: PokemonRecord;
  displayName: string;
  imageUrls: string[];
}

interface EvolutionOption {
  record: PokemonRecord;
  stage: number;
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
  const [selectedPointerMap, setSelectedPointerMap] = useState<
    Record<string, string>
  >({});
  const [evolutionOptionsMap, setEvolutionOptionsMap] = useState<
    Record<string, EvolutionOption[]>
  >({});
  const [loadingPointerMap, setLoadingPointerMap] = useState<
    Record<string, boolean>
  >({});

  const entries = useMemo<FieldDisplayEntry[]>(() => {
    return currentFieldPokemon
      .map((entry) => {
        const record = getPokemonByPointer(entry.pointer);
        if (!record) return null;
        const displayName = record.names.ko || record.names.en;
        const imageUrls = getPokemonImageSources(record);
        return { entry, record, displayName, imageUrls };
      })
      .filter((value): value is FieldDisplayEntry => value != null);
  }, []);

  const entryLookup = useMemo(() => {
    const map = new Map<string, FieldDisplayEntry>();
    entries.forEach((entry) => {
      map.set(entry.record.pointer, entry);
    });
    return map;
  }, [entries]);

  const ensureEvolutionOptions = useCallback(
    async (pointer: string) => {
      if (evolutionOptionsMap[pointer] || loadingPointerMap[pointer]) return;
      const baseEntry = entryLookup.get(pointer);
      if (!baseEntry) return;

      setLoadingPointerMap((prev) => ({ ...prev, [pointer]: true }));
      try {
        const chain = await fetchEvolutionChain(baseEntry.record.id);
        const preferredForm = baseEntry.record.form;
        const seenPointers = new Set<string>();
        const seenStatKeys = new Set<string>();
        const options: EvolutionOption[] = [];

        const addRecord = (record: PokemonRecord | null, stage: number) => {
          if (!record) return;
          if (seenPointers.has(record.pointer)) return;
          const statsKey = `${record.stats.attack}-${record.stats.defense}-${record.stats.stamina}`;
          const isCurrentForm = record.pointer === baseEntry.record.pointer;
          if (!isCurrentForm && seenStatKeys.has(statsKey)) return;
          seenPointers.add(record.pointer);
          seenStatKeys.add(statsKey);
          options.push({ record, stage });
        };

        for (const species of chain) {
          const familyRecords = getPokemonFamilyByDexId(species.id);
          if (familyRecords.length > 0) {
            familyRecords.forEach((record) => addRecord(record, species.stage));
          } else {
            addRecord(
              findPreferredPokemonByDexId(species.id, preferredForm),
              species.stage
            );
          }
        }

        if (
          !options.some(
            (option) => option.record.pointer === baseEntry.record.pointer
          )
        ) {
          addRecord(baseEntry.record, 0);
        }

        options.sort((a, b) =>
          a.stage === b.stage
            ? a.record.pointer.localeCompare(b.record.pointer)
            : a.stage - b.stage
        );

        setEvolutionOptionsMap((prev) => ({ ...prev, [pointer]: options }));
      } catch (error) {
        console.error("진화 정보를 불러오지 못했습니다", error);
      } finally {
        setLoadingPointerMap((prev) => {
          const next = { ...prev };
          delete next[pointer];
          return next;
        });
      }
    },
    [entryLookup, evolutionOptionsMap, loadingPointerMap]
  );

  useEffect(() => {
    if (activePointer) {
      void ensureEvolutionOptions(activePointer);
    }
  }, [activePointer, ensureEvolutionOptions]);

  const toggleActive = (pointer: string) => {
    setActivePointer((prev) => {
      const next = prev === pointer ? null : pointer;
      if (next === pointer) {
        setSelectedPointerMap((prevMap) => {
          if (prevMap[pointer]) return prevMap;
          return { ...prevMap, [pointer]: pointer };
        });
        void ensureEvolutionOptions(pointer);
      }
      return next;
    });
  };

  const handleFamilySelect = (basePointer: string, pointer: string) => {
    setSelectedPointerMap((prev) => ({ ...prev, [basePointer]: pointer }));
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
                        src={item.imageUrls[0] ?? item.entry.imageUrl}
                        alt={`${item.displayName} artwork`}
                        onError={(event) => {
                          const img = event.currentTarget;
                          const currentIndex = Number.parseInt(
                            img.dataset.altIndex ?? "0",
                            10
                          );
                          const nextIndex = currentIndex + 1;
                          const urls = item.imageUrls;
                          if (nextIndex < urls.length) {
                            img.dataset.altIndex = String(nextIndex);
                            img.src = urls[nextIndex];
                          } else {
                            img.onerror = null;
                          }
                        }}
                        data-alt-index="0"
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
                      {(() => {
                        const options =
                          evolutionOptionsMap[item.record.pointer] ?? [];
                        const hasLoaded = options.length > 0;
                        const fallbackOptions: EvolutionOption[] = hasLoaded
                          ? options
                          : [{ record: item.record, stage: 0 }];

                        const activeFamilyPointer =
                          selectedPointerMap[item.record.pointer] ??
                          item.record.pointer;
                        const selectedRecord =
                          fallbackOptions.find(
                            (option) =>
                              option.record.pointer === activeFamilyPointer
                          )?.record ?? fallbackOptions[0].record;

                        return (
                          <div className="flex flex-col gap-8">
                            <div className="flex flex-wrap gap-2">
                              {fallbackOptions.map((option) => {
                                const isSelected =
                                  option.record.pointer === activeFamilyPointer;
                                return (
                                  <button
                                    key={option.record.pointer}
                                    type="button"
                                    onClick={() =>
                                      handleFamilySelect(
                                        item.record.pointer,
                                        option.record.pointer
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                                      isSelected
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                                  >
                                    {option.record.names.ko ||
                                      option.record.names.en}
                                  </button>
                                );
                              })}
                            </div>

                            {!hasLoaded && (
                              <p className="text-sm text-gray-500">
                                진화 정보를 불러오는 중입니다...
                              </p>
                            )}

                            {DISPLAY_LEAGUES.map((league) => {
                              const cache = getSpeciesCache(
                                selectedRecord,
                                league
                              );
                              const combos = cache.sortedCombos.slice(0, 10);

                              return (
                                <div
                                  key={`${selectedRecord.pointer}-${league.maxCP}`}
                                >
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
                        );
                      })()}
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
