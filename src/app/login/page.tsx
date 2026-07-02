"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginCoordinator, getSectors } from "@/app/actions";

interface Sector {
  id: string;
  name: string;
  meta: number;
  allocatedCount: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tempUser, setTempUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(true);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setIsDark(savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Sector icons map
  const sectorIcons: Record<string, string> = {
    Segurança: "shield",
    Eventos: "directions_walk",
    Logística: "local_shipping",
    DIP: "diversity_3",
    ADM: "admin_panel_settings",
    Hakunas: "medical_services",
    Mídia: "photo_camera",
    QAP: "radio",
    Comunicação: "campaign",
  };

  useEffect(() => {
    // Clear previous sessions upon loading login
    localStorage.removeItem("coordinator_user");
    localStorage.removeItem("active_sector");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginCoordinator(email, password);

      if (!res.success || !res.data) {
        setError(res.error || "Credenciais incorretas.");
        setLoading(false);
        return;
      }

      const userData = res.data;
      localStorage.setItem("coordinator_user", JSON.stringify(userData));

      if (userData.isAdmin) {
        router.push("/admin");
      } else {
        // For coordinators, retrieve sectors and open the select modal
        setTempUser(userData);
        const secRes = await getSectors();
        if (secRes.success && secRes.data) {
          setSectors(secRes.data);
        }
        setShowModal(true);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSector = (sector: { id: string; name: string }) => {
    localStorage.setItem("active_sector", JSON.stringify(sector));
    router.push("/recrutamento");
  };

  return (
    <main className="flex min-h-screen w-full bg-[#121212] text-white">
      {/* Left Cover Section - Hidden on mobile */}
      <section className="hidden lg:flex lg:w-3/5 xl:w-2/3 relative items-center justify-center overflow-hidden border-r border-[#2a2a2a] keep-dark">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/amazonia_sunset.jpg')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent opacity-95"></div>
        
        {/* Decorative Grid Line/Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ff5500_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>

        <div className="relative z-10 p-12 max-w-2xl">
          <span className="material-symbols-outlined text-[#ff5500] text-6xl mb-6 font-variation-settings-fill">
            mountain_flag
          </span>
          <h1 className="font-display font-extrabold text-5xl xl:text-6xl tracking-tight leading-tight text-white mb-6">
            LEGENDÁRIOS<br />
            <span className="font-light text-[#ff5500] tracking-wide">PORTAL DO SERVO</span>
          </h1>
          <p className="font-sans text-[#f3f4f6] text-xl max-w-lg font-medium tracking-wide mb-8">
            Gerenciamento Tático e Alocação de Servos
          </p>
          <div className="flex gap-2">
            <div className="h-1.5 w-16 bg-[#ff5500] rounded-full"></div>
            <div className="h-1.5 w-3 bg-[#2a2a2a] rounded-full"></div>
            <div className="h-1.5 w-3 bg-[#2a2a2a] rounded-full"></div>
          </div>
        </div>

        {/* Subtle orange aura glow in bottom corner */}
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#ff5500]/5 rounded-full blur-[140px]"></div>
      </section>

      {/* Right Login Card Section */}
      <section className="w-full lg:w-2/5 xl:w-1/3 bg-[#131313] flex flex-col justify-center px-6 py-12 md:px-16 relative">
        {/* Theme Switcher Button */}
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 hover:bg-[#2a2a2a] rounded-full text-[#e0e0e0] hover:text-white transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
            title={isDark ? "Ativar Tema Claro" : "Ativar Tema Escuro"}
          >
            <span className="material-symbols-outlined text-xl">
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>

        <div className="w-full max-w-md mx-auto">
          
          {/* Logo visible only on mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-[#ff5500]/15 rounded-2xl flex items-center justify-center border border-[#ff5500]/30 mb-3">
              <span className="material-symbols-outlined text-[#ff5500] text-4xl">
                mountain_flag
              </span>
            </div>
            <h2 className="font-display text-2xl font-black tracking-tight text-white uppercase">Portal do Servo</h2>
            <p className="text-xs text-[#e0e0e0] mt-1 font-medium tracking-wide">LEGENDÁRIOS BRASIL</p>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">Acesse o Portal</h2>
            <p className="font-sans text-sm text-[#e0e0e0]">Entre com suas credenciais unificadas de coordenação.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-red-400">error</span>
                <p className="text-xs text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#e0e0e0] uppercase tracking-wider block" htmlFor="email">
                E-mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: coordenadores@legendarios.com"
                  className="w-full pl-11 pr-4 py-3 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-[#e0e0e0] uppercase tracking-wider block" htmlFor="password">
                  Senha
                </label>
                <a href="#" className="text-[11px] text-[#ff5500] font-bold hover:underline">
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded bg-[#1c1c1c] border-[#2a2a2a] text-[#ff5500] focus:ring-0"
              />
              <label htmlFor="remember" className="text-xs text-[#e0e0e0] select-none font-medium">
                Manter meu login ativo
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff5500] hover:bg-[#ff6600] text-white font-display font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[#ff5500]/10 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 text-center text-xs text-gray-500">
            <p>Selecione coordenadores@legendarios.com (senha: legendarios) para testes.</p>
          </div>

        </div>
      </section>

      {/* Sector Selection Popup Modal (Rendered after successful login for non-admin) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2a] bg-[#131313]">
              <h3 className="font-display text-xl font-bold text-white">Qual setor você está coordenando?</h3>
              <p className="text-xs text-[#e0e0e0] mt-1">Selecione o departamento que você irá gerenciar neste dispositivo.</p>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
              {sectors.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSector({ id: s.id, name: s.name })}
                  className="group p-4 border border-[#2a2a2a] bg-[#131313] hover:border-[#ff5500] rounded-xl text-left flex items-start gap-3.5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] text-[#ff5500] group-hover:bg-[#ff5500] group-hover:text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[22px]">
                      {sectorIcons[s.name] || "shield"}
                    </span>
                  </div>
                  <div className="min-w-0 flex items-center h-10">
                    <span className="font-display font-bold text-sm text-white block truncate">
                      {s.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 bg-[#131313] border-t border-[#2a2a2a] flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-xs font-semibold text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
