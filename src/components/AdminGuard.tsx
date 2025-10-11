import { useEffect, useState } from "react";

interface AdminGuardProps {
  children: React.ReactNode;
}

async function requestAccess(secret: string | null): Promise<boolean> {
  try {
    const response = await fetch("/.netlify/functions/verify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean }
      | null;

    return data?.ok === true;
  } catch (error) {
    console.error("관리자 접근 검증 실패", error);
    return false;
  }
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const params = new URLSearchParams(window.location.search);
    const secret = params.get("secret");

    requestAccess(secret).then((result) => {
      if (!isMounted) return;
      setIsAuthorized(result);
      setChecked(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-gray-600 text-sm">접근 권한 확인 중...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100">
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">접근 권한이 없습니다</h2>
          <p className="text-sm text-gray-600">
            관리자 페이지에 접근할 수 있는 비밀 키가 필요합니다.
          </p>
          <p className="text-xs text-gray-400">
            URL에 `?secret=...` 쿼리를 추가해 접근하세요.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
