import { useState, useEffect, useMemo, type SyntheticEvent } from "react";
import FeedbackWidget from "../components/FeedbackWidget";
import { leagues } from "../data/pokemonDataExtended";
import {
  findBestLevelForIV,
  calculateRank,
} from "../utils/pokemonCalculations";
import {
  findPokemonByName,
  getPokemonSuggestions,
  findPreferredPokemonByDexId,
  getPokemonFamilyByDexId,
  type PokemonRecord,
} from "../data/pokemonRegistry";
import {
  FLOAT_EPSILON,
  createIVKey,
  getSpeciesCache,
  type RankedCombo,
  type SpeciesComboCache,
} from "../lib/speciesRankingCache";
import { fetchEvolutionChain } from "../utils/evolutionChains";

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
  hasInput?: boolean;
}

const STAT_FIELDS: ReadonlyArray<"attack" | "defense" | "hp"> = [
  "attack",
  "defense",
  "hp",
];

const RANKING_OPTIONS = [10, 30, 50, 100] as const;

function getPokemonDisplayName(record: PokemonRecord): string {
  return record.names.ko || record.names.en;
}

function normalizeFormSuffix(form: string): string | null {
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

function getPokemonImageSources(record: PokemonRecord): string[] {
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
  if (typeof record.formSlug === "string" && record.formSlug.trim().length > 0) {
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
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + slug + ".png"
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
function parseIvShortcut(value: string): [number, number, number] | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const separated = trimmed
    .split(/[/.\s,-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  let parts: string[];

  if (separated.length === 3) {
    parts = separated;
  } else if (/^\d{6}$/.test(trimmed)) {
    parts = [trimmed.slice(0, 2), trimmed.slice(2, 4), trimmed.slice(4, 6)];
  } else {
    return null;
  }

  const values = parts.map((part) => Number.parseInt(part, 10));

  if (values.some((value) => Number.isNaN(value) || value < 0 || value > 15)) {
    return null;
  }

  return [values[0], values[1], values[2]];
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

  const computed = rows.map((row) => {
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
      isOptimal: false,
    };
  });

  if (computed.length === 0) {
    return computed;
  }

  const EPS = 1e-6;

  const pickBetter = (candidate: PokemonIV, current: PokemonIV | null) => {
    if (!(candidate.hasInput ?? false)) {
      return current;
    }

    if (!current || !(current.hasInput ?? false)) {
      return candidate;
    }

    const candidateRank = candidate.rank;
    const currentRank = current.rank;

    if (candidateRank != null && currentRank != null) {
      if (candidateRank > currentRank + EPS) return candidate;
      if (currentRank > candidateRank + EPS) return current;
    } else if (candidateRank != null) {
      return candidate;
    } else if (currentRank != null) {
      return current;
    }

    const candidatePos = candidate.rankPosition ?? Infinity;
    const currentPos = current.rankPosition ?? Infinity;
    if (candidatePos < currentPos) return candidate;
    if (candidatePos > currentPos) return current;

    const candidateStat = candidate.statProduct ?? -Infinity;
    const currentStat = current.statProduct ?? -Infinity;
    if (candidateStat > currentStat + EPS) return candidate;
    if (currentStat > candidateStat + EPS) return current;

    return current;
  };

  const best = computed.reduce(
    (bestSoFar, row) => pickBetter(row, bestSoFar),
    null as PokemonIV | null
  );

  if (!best) {
    return computed;
  }

  const bestRank = best.rank;
  const bestPos = best.rankPosition ?? null;
  const bestStat = best.statProduct;

  return computed.map((row) => {
    const sameRank =
      bestRank == null
        ? row.rank == null
        : row.rank != null && Math.abs(row.rank - bestRank) <= EPS;
    const samePos = (row.rankPosition ?? null) === bestPos;
    const sameStat =
      bestStat == null
        ? row.statProduct == null
        : row.statProduct != null &&
          Math.abs(row.statProduct - bestStat) <= EPS;

    return {
      ...row,
      isOptimal: sameRank && samePos && sameStat,
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
      (row.isOptimal ?? false) === (other.isOptimal ?? false) &&
      (row.hasInput ?? false) === (other.hasInput ?? false)
    );
  });
}

export default function Main() {
  const [pokemonName, setPokemonName] = useState("");
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]);
  const [pokemonIVs, setPokemonIVs] = useState<PokemonIV[]>([
    { id: 1, attack: 0, defense: 0, hp: 0, level: 1, hasInput: false },
  ]);
  const [currentPokemon, setCurrentPokemon] = useState<PokemonRecord | null>(
    null
  );
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleRankCount, setVisibleRankCount] = useState<number>(10);
  const [evolutionEntries, setEvolutionEntries] = useState<
    Array<{ record: PokemonRecord; stage: number }>
  >([]);
  const [evolutionState, setEvolutionState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [evolutionError, setEvolutionError] = useState<string | null>(null);

  const rankingCache = useMemo<SpeciesComboCache | null>(() => {
    if (!currentPokemon) {
      return null;
    }
    return getSpeciesCache(currentPokemon, selectedLeague);
  }, [currentPokemon, selectedLeague]);

  const topRankings = useMemo<RankedCombo[]>(() => {
    if (!rankingCache) {
      return [];
    }
    return rankingCache.sortedCombos.slice(0, visibleRankCount);
  }, [rankingCache, visibleRankCount]);

  const pokemonDisplayName =
    currentPokemon?.names.ko || currentPokemon?.names.en || "";

  const evolutionSummaries = useMemo(() => {
    if (!currentPokemon) {
      return [];
    }

    return evolutionEntries.map((entry) => ({
      record: entry.record,
      stage: entry.stage,
      displayName: getPokemonDisplayName(entry.record),
      imageUrls: getPokemonImageSources(entry.record),
      isCurrent: entry.record.pointer === currentPokemon.pointer,
    }));
  }, [currentPokemon, evolutionEntries]);

  useEffect(() => {
    if (!currentPokemon) return;
    setPokemonIVs((prev) => {
      const next = recalculateRows(prev, currentPokemon, selectedLeague);
      return rowsAreEqual(prev, next) ? prev : next;
    });
  }, [currentPokemon, selectedLeague]);

  useEffect(() => {
    let cancelled = false;

    if (!currentPokemon) {
      setEvolutionEntries([]);
      setEvolutionState("idle");
      setEvolutionError(null);
      return () => {
        cancelled = true;
      };
    }

    setEvolutionState("loading");
    setEvolutionError(null);
    setEvolutionEntries([]);

    fetchEvolutionChain(currentPokemon.id)
      .then((chain) => {
        if (cancelled) return;

        const orderedChain = [...chain].sort((a, b) => a.order - b.order);
        const preferredForm = currentPokemon.form;
        const seenPointers = new Set<string>();
        const entries: Array<{ record: PokemonRecord; stage: number }> = [];

        for (const species of orderedChain) {
          const isCurrentSpecies = species.id === currentPokemon.id;
          const familyRecords = isCurrentSpecies
            ? getPokemonFamilyByDexId(species.id)
            : null;

          if (familyRecords && familyRecords.length > 0) {
            const sortedFamily = [...familyRecords].sort((a, b) => {
              const aIsCurrent = a.pointer === currentPokemon.pointer;
              const bIsCurrent = b.pointer === currentPokemon.pointer;
              if (aIsCurrent && !bIsCurrent) return -1;
              if (!aIsCurrent && bIsCurrent) return 1;
              if (a.form !== b.form) return a.form.localeCompare(b.form);
              return a.pointer.localeCompare(b.pointer);
            });

            const seenStatKeys = new Set<string>();

            for (const familyRecord of sortedFamily) {
              if (seenPointers.has(familyRecord.pointer)) continue;

              const statsKey = [
                familyRecord.stats.attack,
                familyRecord.stats.defense,
                familyRecord.stats.stamina,
              ].join('-');
              const isCurrentForm = familyRecord.pointer === currentPokemon.pointer;

              if (!isCurrentForm && seenStatKeys.has(statsKey)) {
                continue;
              }

              seenPointers.add(familyRecord.pointer);
              seenStatKeys.add(statsKey);
              entries.push({ record: familyRecord, stage: species.stage });
            }
            continue;
          }

          const record = isCurrentSpecies
            ? currentPokemon
            : findPreferredPokemonByDexId(species.id, preferredForm);

          if (!record || seenPointers.has(record.pointer)) {
            continue;
          }

          seenPointers.add(record.pointer);
          entries.push({ record, stage: species.stage });
        }

        if (!seenPointers.has(currentPokemon.pointer)) {

          const fallbackStage =
            orderedChain.find((species) => species.id === currentPokemon.id)
              ?.stage ?? 0;
          entries.unshift({ record: currentPokemon, stage: fallbackStage });
        }

        setEvolutionEntries(entries);
        setEvolutionState("success");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("진화 정보를 가져오지 못했습니다.", error);
        setEvolutionEntries([]);
        setEvolutionState("error");
        setEvolutionError(
          error instanceof Error ? error.message : String(error)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [currentPokemon]);

  const addNewRow = () => {
    const newId = Math.max(...pokemonIVs.map((iv) => iv.id)) + 1;
    setPokemonIVs([
      ...pokemonIVs,
      { id: newId, attack: 0, defense: 0, hp: 0, level: 1, hasInput: false },
    ]);
  };

  const removeRow = (id: number) => {
    if (pokemonIVs.length > 1) {
      setPokemonIVs(pokemonIVs.filter((iv) => iv.id !== id));
    }
  };

  const applyIvChanges = (
    id: number,
    changes: Partial<Omit<PokemonIV, "id">>
  ) => {
    setPokemonIVs((prev) => {
      const baseUpdated = prev.map((iv) =>
        iv.id === id ? { ...iv, ...changes } : iv
      );

      const affectsStats = STAT_FIELDS.some((key) =>
        Object.prototype.hasOwnProperty.call(changes, key)
      );

      if (!currentPokemon || !affectsStats) {
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

  const handleEvolutionSelect = (record: PokemonRecord) => {
    const name = getPokemonDisplayName(record);
    setPokemonName(name);
    setShowSuggestions(false);
    setCurrentPokemon(record);
  };

  const handleEvolutionImageError = (
    event: SyntheticEvent<HTMLImageElement>,
    urls: readonly string[]
  ) => {
    const img = event.currentTarget;
    const currentIndex = Number.parseInt(img.dataset.altIndex ?? "0", 10);
    const nextIndex = currentIndex + 1;

    if (nextIndex < urls.length) {
      img.dataset.altIndex = String(nextIndex);
      img.src = urls[nextIndex];
    } else {
      img.onerror = null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <FeedbackWidget />
      <div>{/* <UpdateBar /> */}</div>
      <div className="max-w-4xl mx-auto">
        {/* 포켓몬 입력 */}
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
            {currentPokemon ? (
              <div className="mt-2 text-sm text-green-600">
                {currentPokemon.names.ko || currentPokemon.names.en} 발견!
                (공격: {currentPokemon.stats.attack}, 방어:{" "}
                {currentPokemon.stats.defense}, 체력:{" "}
                {currentPokemon.stats.stamina})
              </div>
            ) : (
              <div className="mt-2 text-sm font-bold text-red-600">
                포켓몬을 찾을 수 없습니다.
              </div>
            )}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setShowSuggestions(false);
                  }
                }}
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
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm transition-colors duration-200 ${
                  selectedLeague.name === league.name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <span className="block md:inline">{league.name}</span>
                <span className="block text-[10px] md:hidden">
                  CP {league.maxCP === 9999 ? "제한 없음" : league.maxCP}
                </span>
                <span className="hidden md:inline">
                  {" "}
                  (CP {league.maxCP === 9999 ? "제한 없음" : league.maxCP})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 진화 라인 미리보기 */}
        {currentPokemon && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  진화 라인 미리보기
                </h2>
                <p className="text-sm text-gray-500">
                  원하는 포켓몬을 선택해 바로 전환하세요.
                </p>
              </div>
            </div>

            {evolutionState === "loading" && (
              <p className="text-sm text-gray-500 mt-3">
                진화 정보를 불러오는 중입니다...
              </p>
            )}

            {evolutionState === "error" && (
              <p className="text-sm text-red-600 mt-3">
                진화 정보를 가져오지 못했습니다.
                {evolutionError ? ` (${evolutionError})` : ""}
              </p>
            )}

            {evolutionState === "success" &&
              evolutionSummaries.length === 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  해당 포켓몬의 진화 정보가 없습니다.
                </p>
              )}

            {evolutionState === "success" && evolutionSummaries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {evolutionSummaries.map((summary) => (
                  <button
                    key={summary.record.pointer}
                    type="button"
                    onClick={() => handleEvolutionSelect(summary.record)}
                    className={`group flex flex-col items-center gap-3 rounded-xl border p-3 md:p-4 transition-all duration-200 ${
                      summary.isCurrent
                        ? "border-blue-500 bg-blue-50/80 shadow-md"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow"
                    }`}
                  >
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white p-2 shadow-inner">
                      <img
                        src={summary.imageUrls[0]}
                        alt={summary.displayName}
                        data-alt-index="0"
                        onError={(event) =>
                          handleEvolutionImageError(event, summary.imageUrls)
                        }
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {summary.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IV 입력 테이블 */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-8">
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
            <table className="w-full text-[10px] md:text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs md:text-sm whitespace-nowrap">
                  <th className="hidden md:table-cell text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700">
                    포켓몬
                  </th>
                  <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700">
                    레벨
                  </th>
                  <th
                    className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700"
                    colSpan={3}
                  >
                    공격/방어/체력
                  </th>
                  <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700">
                    CP
                  </th>
                  <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700">
                    %
                  </th>
                  <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700">
                    랭크
                  </th>
                  <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-700">
                    삭제
                  </th>
                </tr>
              </thead>
              <tbody>
                {pokemonIVs.map((pokemonIV) => {
                  const hasInput = pokemonIV.hasInput ?? false;
                  const showCP = hasInput && pokemonIV.cp != null;
                  const cpExceeded =
                    showCP && pokemonIV.cp! > selectedLeague.maxCP;
                  const cpClass = showCP
                    ? cpExceeded
                      ? "text-red-600"
                      : "text-blue-600"
                    : "text-gray-400";

                  const showRankPercent = hasInput && pokemonIV.rank != null;
                  const rankPercentClass = showRankPercent
                    ? pokemonIV.rank! >= 90
                      ? "text-green-600"
                      : pokemonIV.rank! >= 70
                      ? "text-yellow-600"
                      : "text-gray-600"
                    : "text-gray-400";

                  const showRankPosition =
                    hasInput && pokemonIV.rankPosition != null;

                  return (
                    <tr
                      key={pokemonIV.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 text-xs md:text-sm ${
                        currentPokemon && pokemonIV.isOptimal
                          ? "bg-green-50 border-green-200"
                          : ""
                      }`}
                    >
                      <td className="hidden md:table-cell py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm">
                        <span className="text-gray-600">
                          {currentPokemon
                            ? currentPokemon.names.ko || currentPokemon.names.en
                            : "-"}
                          {currentPokemon && pokemonIV.isOptimal && (
                            <span className="ml-2 text-green-600 font-semibold">
                              최적
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm">
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="text-xs md:text-sm font-medium text-gray-700">
                            {pokemonIV.level
                              ? pokemonIV.level.toFixed(1)
                              : "계산 중..."}
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm"
                        colSpan={3}
                      >
                        <input
                          type="text"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.trim().length === 0) {
                              applyIvChanges(pokemonIV.id, {
                                attack: 0,
                                defense: 0,
                                hp: 0,
                                hasInput: false,
                                cp: undefined,
                                rank: undefined,
                                statProduct: undefined,
                                rankPosition: undefined,
                              });
                              return;
                            }
                            const parsed = parseIvShortcut(value);
                            if (!parsed) {
                              applyIvChanges(pokemonIV.id, { hasInput: false });
                              return;
                            }
                            const [attack, defense, hp] = parsed;
                            applyIvChanges(pokemonIV.id, {
                              attack,
                              defense,
                              hp,
                              hasInput: true,
                            });
                          }}
                          placeholder="예: 0/14/15, 0.1.1, 000805"
                          className="w-full px-1 sm:px-2 md:px-3 py-2 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm">
                        <span className={`font-semibold ${cpClass}`}>
                          {showCP ? pokemonIV.cp : "-"}
                          {cpExceeded && (
                            <span className="text-xs text-red-500 block">
                              CP 초과!
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm">
                        <span className={`font-semibold ${rankPercentClass}`}>
                          {showRankPercent
                            ? `${pokemonIV.rank!.toFixed(2)}%`
                            : "-"}
                        </span>
                      </td>
                      <td className="py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm">
                        <span className="font-semibold text-gray-700">
                          {showRankPosition
                            ? `#${pokemonIV.rankPosition}`
                            : "-"}
                        </span>
                      </td>
                      <td className="py-2 px-1 sm:px-2 md:py-3 md:px-4 text-xs md:text-sm">
                        {pokemonIVs.length > 1 && (
                          <button
                            onClick={() => removeRow(pokemonIV.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs md:text-sm transition-colors duration-200 whitespace-nowrap cursor-pointer"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {currentPokemon && rankingCache && topRankings.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {pokemonDisplayName} CP 랭킹
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedLeague.name} 리그 기준 상위 {topRankings.length}개
                  조합
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="rank-count"
                  className="text-sm font-medium text-gray-700"
                >
                  표시 개수
                </label>
                <select
                  id="rank-count"
                  value={visibleRankCount}
                  onChange={(e) => setVisibleRankCount(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RANKING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      상위 {option}개
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm whitespace-nowrap text-gray-600">
                    <th className="py-2 px-3">순위</th>
                    <th className="py-2 px-3">IV</th>
                    <th className="py-2 px-3">레벨</th>
                    <th className="py-2 px-3">CP</th>
                    <th className="py-2 px-3">스탯%</th>
                  </tr>
                </thead>
                <tbody>
                  {topRankings.map((combo) => {
                    const rankPercent = combo.rankPercent;
                    const isTop = combo.rankPosition === 1;
                    return (
                      <tr
                        key={combo.key}
                        className={`border-b border-gray-100 text-sm ${
                          isTop ? "bg-green-50" : ""
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-gray-700">
                          #{combo.rankPosition}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {combo.attack}/{combo.defense}/{combo.hp}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {combo.level.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-gray-700">{combo.cp}</td>
                        <td className="py-2 px-3 text-gray-700">
                          {rankPercent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
