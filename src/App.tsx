import { NavLink, Route, Routes } from "react-router-dom";
import Main from "./pages/Main";
import FieldOverview from "./pages/FieldOverview";
import FieldAdmin from "./pages/FieldAdmin";
import ReportAdmin from "./pages/ReportAdmin";

const links = [
  { to: "/", label: "IV 계산기" },
  { to: "/field", label: "필드 포켓몬 랭킹" },
  // { to: "/admin/field", label: "필드 데이터 관리" },
];

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              포켓몬 GO PvP 도우미
            </h1>
            <p className="text-sm text-gray-500">
              현재 필드 정보와 PvP 개체값 계산을 한곳에서 확인하세요.
            </p>
          </div>
          <nav className="flex gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-600 hover:bg-blue-50"
                  }`
                }
                end={link.to === "/"}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/field" element={<FieldOverview />} />
          <Route path="/admin/" element={<FieldAdmin />} />
          <Route path="/admin/report" element={<ReportAdmin />} />
        </Routes>
      </main>
      <footer className="mt-16 w-full bg-slate-900 text-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10 text-sm">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">
              포켓몬 GO PvP IV 계산기 한눈에
            </h2>
            <p>
              한글 검색이 가능한 <strong>포켓몬 IV 계산기</strong>로 포켓몬 GO
              PvP 배틀 개체값을 빠르게 비교하세요.
              슈퍼리그·하이퍼리그·마스터리그 별로 개체값을 입력하면
              <strong> 리그별 개체값 비교</strong>, CP 계산, 추천 포켓몬
              미리보기를 한 번에 확인할 수 있습니다.
            </p>
            <p>
              리그별 추천 포켓몬을 찾거나 폼 체인지·합체 폼의{" "}
              <strong>포켓몬고 CP 계산</strong>이 필요할 때도 즉시 확인
              가능합니다.
            </p>
          </section>
          <section className="space-y-3">
            <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-slate-200/70">
              <div className="space-y-1">
                <p>해당 웹 페이지는 오픈소스입니다.</p>
                <a
                  href="https://github.com/mothy900/poke-bulk/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-200 hover:text-white transition-colors"
                >
                  <span>GitHub에서 프로젝트 살펴보기</span>
                </a>
              </div>
              <p className="text-slate-200/60">
                &copy; {new Date().getFullYear()} POKE BULK. All rights
                reserved.
              </p>
            </div>
          </section>
        </div>
      </footer>
    </div>
  );
}

export default App;
