import { useState } from "react";

interface UpdateResponse {
  ok: boolean;
  message?: string;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
}

const DEFAULT_STATUS =
  "Writes species-meta.json & name-index.json under src/data/pokemon";

export default function UpdateBar() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/update-data", { method: "POST" });
      const payload = (await response
        .json()
        .catch(() => ({}))) as Partial<UpdateResponse>;

      if (!response.ok || !payload.ok) {
        const message =
          payload.message ??
          payload.stderr ??
          payload.stdout ??
          `Request failed (${response.status})`;
        throw new Error(message);
      }

      const fromStdout = payload.stdout
        ?.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .pop();
      const summary = payload.message ?? fromStdout ?? "Data update completed.";

      const withTiming =
        payload.durationMs != null
          ? `${summary} (${payload.durationMs} ms)`
          : summary;

      setStatus(withTiming);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="text-sm text-amber-900">
        <div className="font-semibold">Data snapshot</div>
        <div className="opacity-80">
          {error ? <span className="text-red-600">{error}</span> : status}
        </div>
      </div>
      <button
        disabled={loading}
        onClick={handleUpdate}
        className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "Updating..." : "Run JavaScript update"}
      </button>
    </div>
  );
}
