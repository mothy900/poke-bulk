import { NavLink, Route, Routes } from "react-router-dom";
import Main from "./pages/Main";
import FieldOverview from "./pages/FieldOverview";
import FieldAdmin from "./pages/FieldAdmin";

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
        </Routes>
      </main>
    </div>
  );
}

export default App;
