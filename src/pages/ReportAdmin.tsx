import { useEffect, useState } from "react";
import AdminGuard from "../components/AdminGuard";

interface ReportEntry {
  id: string;
  title: string;
  content: string;
  nickname: string;
  createdAt: string;
}

interface FetchState {
  status: "idle" | "loading" | "success" | "error";
  error?: string;
}

export default function ReportAdmin() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    setFetchState({ status: "loading" });
    fetch("/.netlify/functions/get-feedback")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as ReportEntry[];
        setReports(data);
        setFetchState({ status: "success" });
      })
      .catch((error) => {
        console.error(error);
        setFetchState({ status: "error", error: (error as Error).message });
      });
  }, []);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-100 py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
            <h1 className="text-2xl font-semibold text-gray-800">
              사용자 리뷰 / 보고
            </h1>
            <p className="text-sm text-gray-600">
              사용자들이 남긴 스티커 메모 목록입니다. 개선 아이디어나 버그
              신고를 확인하세요.
            </p>
            {fetchState.status === "loading" && (
              <p className="text-sm text-gray-500">불러오는 중...</p>
            )}
            {fetchState.status === "error" && (
              <p className="text-sm text-red-600">
                데이터를 불러오지 못했습니다: {fetchState.error}
              </p>
            )}
          </header>

          {reports.length === 0 && fetchState.status === "success" ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
              아직 작성된 메모가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="bg-white rounded-xl shadow p-6 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {report.title}
                      </h2>
                      <p className="text-xs text-gray-400">
                        작성일: {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {report.nickname ? `by ${report.nickname}` : "익명"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {report.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
