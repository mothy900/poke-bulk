import { useState } from "react";
import { fetchLatestBaseStats } from "../lib/fetchLatest";
import { saveBaseStats, getBaseStatsMeta } from "../lib/statsStore";

export default function UpdateBar() {
  const [loading, setLoading] = useState(false);
  const meta = getBaseStatsMeta();

  return (
    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="text-sm text-amber-900">
        <div className="font-semibold">데이터 스냅샷</div>
        <div className="opacity-80">
          {meta ? (
            <>localStorage: {meta.fetchedAt ?? meta.generatedAt}</>
          ) : (
            <>
              bundled snapshot in <code>/public/data</code>
            </>
          )}
        </div>
      </div>
      <button
        disabled={loading}
        onClick={async () => {
          try {
            setLoading(true);
            const latest = await fetchLatestBaseStats();
            saveBaseStats(latest.data, latest.meta);
            alert(`업데이트 완료! (${latest.meta.count} 종)`);
          } catch (e: any) {
            alert("업데이트 실패: " + e?.message);
          } finally {
            setLoading(false);
          }
        }}
        className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "업데이트 중…" : "최신 데이터로 업데이트"}
      </button>
    </div>
  );
}
