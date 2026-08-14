import { useState } from "react";
import { Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, Moon, Search, Sun } from "lucide-react";
import { LandingPage } from "./LandingPage";
import { WalletPage } from "./WalletPage";

export function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const goToWallet = () => {
    const value = input.trim();
    if (value) navigate(`/wallets/${encodeURIComponent(value)}`);
  };

  return (
    <main className={`min-h-screen bg-panel ${darkMode ? "dark" : ""}`}>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-white">
              <BarChart3 size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-6">Polyand Analytics</h1>
              <p className="text-sm text-slate-500">Polymarket copy-trading intelligence</p>
            </div>
          </button>
          <div className="flex flex-1 gap-2 lg:max-w-xl">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && goToWallet()}
              placeholder="0x wallet address, Polymarket username, profile slug, or URL"
              className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal"
            />
            <button
              type="button"
              onClick={goToWallet}
              className="flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white"
              title="Load wallet analytics"
            >
              <Search size={16} />
              Load
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white text-ink"
              title={darkMode ? "Use light mode" : "Use dark mode"}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/wallets/:address" element={<WalletPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

// Back-compat: old deep-link `/?wallet=0x...` redirects to `/wallets/:address`.
function LandingRoute() {
  const [params] = useSearchParams();
  const legacyWallet = params.get("wallet");
  if (legacyWallet) {
    return <Navigate to={`/wallets/${encodeURIComponent(legacyWallet)}`} replace />;
  }
  return <LandingPage />;
}
