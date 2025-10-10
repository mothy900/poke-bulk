import { useMemo, useState } from "react";
import fieldSourcesRaw from "../../scripts/field-sources.json?raw";
import nameIndexRaw from "../data/pokemon/name-index.json?raw";
import speciesMetaRaw from "../data/pokemon/species-meta.json?raw";

const SOURCE_OPTIONS = [
  { value: "event", label: "이벤트" },
  { value: "season", label: "시즌" },
  { value: "nest", label: "둥지" },
  { value: "raid", label: "레이드" },
] as const;

type SourceKey = (typeof SOURCE_OPTIONS)[number]["value"];

type RawEntry =
  | string
  | {
      name?: string;
      pointer?: string;
      notes?: string;
    };

interface EditableEntry {
  id: string;
  source: SourceKey;
  name: string;
  pointer: string;
  notes: string;
  pointerManuallyEdited: boolean;
}

const nameIndexMap: Record<string, { ref: string; display: string }> =
  JSON.parse(nameIndexRaw);

const speciesMetaMap: Record<
  string,
  {
    names?: { en?: string; ko?: string };
  }
> = JSON.parse(speciesMetaRaw);

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripParentheses(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findPointerForName(name: string): string | null {
  const normalized = normalizeAlias(name);
  if (!normalized) return null;
  const direct = nameIndexMap[normalized];
  if (direct) return direct.ref;

  const stripped = stripParentheses(name);
  if (stripped && stripped !== name) {
    const candidate = findPointerForName(stripped);
    if (candidate) return candidate;
  }

  const alnumOnly = normalized
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (alnumOnly && alnumOnly !== normalized) {
    const candidate = nameIndexMap[alnumOnly];
    if (candidate) return candidate.ref;
  }

  return null;
}

const pointerLabelCache = new Map<string, string>();
function pointerDisplay(pointer: string): string {
  if (!pointer) return "";
  if (pointerLabelCache.has(pointer)) return pointerLabelCache.get(pointer)!;
  const meta = speciesMetaMap[pointer];
  const label = meta?.names?.ko || meta?.names?.en || pointer;
  pointerLabelCache.set(pointer, label);
  return label;
}

function parseInitialEntries(): Record<SourceKey, EditableEntry[]> {
  const parsed: Partial<Record<SourceKey, EditableEntry[]>> = {};
  try {
    const json = JSON.parse(fieldSourcesRaw) as Record<SourceKey, RawEntry[]>;
    SOURCE_OPTIONS.forEach(({ value }) => {
      const list = json[value] ?? [];
      parsed[value] = list.map((entry, index) => {
        if (typeof entry === "string") {
          const autoPointer = findPointerForName(entry) ?? "";
          return {
            id: `${value}-${index}-${entry}`,
            source: value,
            name: entry,
            pointer: autoPointer,
            notes: "",
            pointerManuallyEdited: false,
          };
        }

        const rawName = entry.name ?? "";
        let rawPointer = entry.pointer ?? "";
        const notes = entry.notes ?? "";
        let pointerManuallyEdited = Boolean(rawPointer);
        if (!rawPointer && rawName) {
          const autoPointer = findPointerForName(rawName);
          if (autoPointer) {
            rawPointer = autoPointer;
            pointerManuallyEdited = false;
          }
        }

        return {
          id: `${value}-${index}-${entry.name ?? entry.pointer ?? "entry"}`,
          source: value,
          name: rawName,
          pointer: rawPointer,
          notes,
          pointerManuallyEdited,
        };
      });
    });
  } catch (error) {
    console.error("Failed to parse field-sources.json", error);
    SOURCE_OPTIONS.forEach(({ value }) => {
      parsed[value] = [];
    });
  }
  return parsed as Record<SourceKey, EditableEntry[]>;
}

const INITIAL_ENTRIES = parseInitialEntries();

function createEmptyEntry(source: SourceKey): EditableEntry {
  return {
    id: `${source}-${crypto.randomUUID?.() ?? Date.now()}`,
    source,
    name: "",
    pointer: "",
    notes: "",
    pointerManuallyEdited: false,
  };
}

function toRawConfig(entries: Record<SourceKey, EditableEntry[]>) {
  const result: Record<SourceKey, RawEntry[]> = {
    event: [],
    season: [],
    nest: [],
    raid: [],
  };

  SOURCE_OPTIONS.forEach(({ value }) => {
    result[value] = entries[value].map(({ name, pointer, notes }) => {
      const trimmedName = name.trim();
      let trimmedPointer = pointer.trim();
      const trimmedNotes = notes.trim();

      if (!trimmedPointer && trimmedName) {
        const resolved = findPointerForName(trimmedName);
        if (resolved) {
          trimmedPointer = resolved;
        }
      }

      const entry: { name?: string; pointer?: string; notes?: string } = {};
      if (trimmedName) entry.name = trimmedName;
      if (trimmedPointer) entry.pointer = trimmedPointer;
      if (trimmedNotes) entry.notes = trimmedNotes;

      if (!entry.pointer && !entry.notes && entry.name) {
        return entry.name;
      }
      return entry;
    });
  });

  return result;
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadSampleCsv() {
  const sample = [
    "source,name,notes,pointer",
    "event,Pikachu,,25__NORMAL",
    "season,Bulbasaur,,1__NORMAL",
    "nest,Dratini,,147__NORMAL",
    "raid,Mewtwo,,150__NORMAL",
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "field-sources-sample.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(contents: string): EditableEntry[] {
  const rows = contents
    .split(/\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) return [];

  let startIndex = 0;
  const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
  if (headers[0] === "source" || headers.includes("source")) {
    startIndex = 1;
  }

  const entries: EditableEntry[] = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    const cols = row.split(",").map((col) => col.trim());
    if (cols.length < 2) continue;

    let source: SourceKey | null = null;
    let name = "";
    let notes = "";
    let pointer = "";

    if (headers[0] === "source") {
      source = cols[0] as SourceKey;
      name = cols[1] ?? "";
      notes = cols[2] ?? "";
      pointer = cols[3] ?? "";
    } else {
      source = cols[0] as SourceKey;
      name = cols[1] ?? "";
      notes = cols[2] ?? "";
      pointer = cols[3] ?? "";
    }

    if (!SOURCE_OPTIONS.some((option) => option.value === source)) {
      continue;
    }

    let pointerValue = pointer;
    let pointerManuallyEdited = Boolean(pointerValue.trim());
    if (!pointerManuallyEdited && name) {
      const resolved = findPointerForName(name);
      if (resolved) {
        pointerValue = resolved;
        pointerManuallyEdited = false;
      }
    }

    entries.push({
      id: `${source}-${crypto.randomUUID?.() ?? Date.now()}-${i}`,
      source,
      name,
      notes,
      pointer: pointerValue,
      pointerManuallyEdited,
    });
  }

  return entries;
}

export default function FieldAdmin() {
  const [entries, setEntries] =
    useState<Record<SourceKey, EditableEntry[]>>(INITIAL_ENTRIES);
  const [selectedSource, setSelectedSource] = useState<SourceKey>("event");
  const [csvError, setCsvError] = useState<string | null>(null);

  const jsonOutput = useMemo(() => {
    const rawConfig = toRawConfig(entries);
    return JSON.stringify(rawConfig, null, 2);
  }, [entries]);

  const handleEntryChange = (
    source: SourceKey,
    id: string,
    field: keyof EditableEntry,
    value: string
  ) => {
    setEntries((prev) => ({
      ...prev,
      [source]: prev[source].map((entry) => {
        if (entry.id !== id) return entry;

        if (field === "pointer") {
          return {
            ...entry,
            pointer: value,
            pointerManuallyEdited: true,
          };
        }

        const next: EditableEntry = {
          ...entry,
          [field]: value,
        };

        if (field === "name" && !entry.pointerManuallyEdited) {
          const resolved = findPointerForName(value);
          next.pointer = resolved ?? "";
          next.pointerManuallyEdited = false;
        }

        return next;
      }),
    }));
  };

  const handleAddEntry = (source: SourceKey) => {
    setEntries((prev) => ({
      ...prev,
      [source]: [...prev[source], createEmptyEntry(source)],
    }));
  };

  const handleRemoveEntry = (source: SourceKey, id: string) => {
    setEntries((prev) => ({
      ...prev,
      [source]: prev[source].filter((entry) => entry.id !== id),
    }));
  };

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setCsvError("CSV에서 유효한 데이터를 찾을 수 없습니다.");
        return;
      }

      setEntries((prev) => {
        const next = { ...prev };
        parsed.forEach((entry) => {
          next[entry.source] = [...next[entry.source], { ...entry }];
        });
        return next;
      });
      setCsvError(null);
    } catch (error) {
      setCsvError(`CSV 파싱 실패: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-100 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            필드 소스 관리자
          </h2>
          <p className="text-sm text-gray-600">
            scripts/field-sources.json 파일에 들어갈 데이터를 편집합니다.
            아래에서 소스별 항목을 추가하거나 수정하고, 완료되면 JSON을
            다운로드하여 파일에 덮어씌운 뒤 `npm run prefetch`를 실행하세요.
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium text-gray-700">
              소스 선택
            </label>
            <div className="flex gap-2">
              {SOURCE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedSource(value)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedSource === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleAddEntry(selectedSource)}
              className="ml-auto bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded-md"
            >
              + 항목 추가
            </button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    포인터(optional)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모(optional)
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries[selectedSource].map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2">
                      <input
                        value={entry.name}
                        onChange={(event) =>
                          handleEntryChange(
                            selectedSource,
                            entry.id,
                            "name",
                            event.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        placeholder="예: Pikachu"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={entry.pointer}
                        onChange={(event) =>
                          handleEntryChange(
                            selectedSource,
                            entry.id,
                            "pointer",
                            event.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        placeholder="자동 매핑됩니다"
                      />
                      {entry.pointer && (
                        <p className="mt-1 text-xs text-gray-500">
                          {pointerDisplay(entry.pointer)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={entry.notes}
                        onChange={(event) =>
                          handleEntryChange(
                            selectedSource,
                            entry.id,
                            "notes",
                            event.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        placeholder="메모"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() =>
                          handleRemoveEntry(selectedSource, entry.id)
                        }
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {entries[selectedSource].length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-gray-500"
                      colSpan={4}
                    >
                      항목이 없습니다. "항목 추가" 버튼을 눌러보세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">CSV 업로드</h3>
          <p className="text-sm text-gray-600">
            source,name,notes,pointer 순서의 CSV 파일을 업로드하면 해당 소스의
            항목에 추가됩니다. 헤더(row)가 있어도 되며, source 값은
            event/season/nest/raid 중 하나여야 합니다.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleCsvUpload(file);
                  event.target.value = "";
                }
              }}
              className="text-sm"
            />
            <button
              onClick={downloadSampleCsv}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              샘플 CSV 다운로드
            </button>
          </div>
          {csvError && <p className="text-sm text-red-600">{csvError}</p>}
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">JSON 결과</h3>
          <p className="text-sm text-gray-600">
            아래 JSON 내용을 scripts/field-sources.json 파일에 덮어쓰고 저장한
            뒤, `npm run prefetch`를 실행하여 랭킹 데이터를 갱신하세요.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => downloadTextFile("field-sources.json", jsonOutput)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md"
            >
              JSON 다운로드
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(jsonOutput);
                alert("JSON을 클립보드에 복사했습니다.");
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-4 py-2 rounded-md"
            >
              JSON 복사
            </button>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs max-h-96 overflow-auto">
            {jsonOutput}
          </pre>
        </section>
      </div>
    </div>
  );
}
