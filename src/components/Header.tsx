"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSectors } from "@/app/actions";

interface Sector {
  id: string;
  name: string;
  meta: number;
  allocatedCount: number;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; nome: string; email: string; isAdmin: boolean } | null>(null);
  const [activeSector, setActiveSector] = useState<{ id: string; name: string } | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch sectors from action
  useEffect(() => {
    async function loadSectors() {
      const res = await getSectors();
      if (res.success && res.data) {
        setSectors(res.data);
      }
    }
    loadSectors();
  }, []);

  // Load user and active sector from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("coordinator_user");
    const storedSector = localStorage.getItem("active_sector");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    
    if (storedSector) {
      setActiveSector(JSON.parse(storedSector));
    } else {
      // If coordinator is not admin, open selector automatically
      setIsModalOpen(true);
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("coordinator_user");
    localStorage.removeItem("active_sector");
    router.push("/login");
  };

  const handleSelectSector = (sector: { id: string; name: string }) => {
    localStorage.setItem("active_sector", JSON.stringify(sector));
    setActiveSector(sector);
    setIsModalOpen(false);
    // Reload path to refresh content or redirect to recruitment queue
    window.location.reload();
  };

  if (loading) {
    return (
      <header className="w-full bg-[#1a1a1a] border-b border-[#2a2a2a] h-16 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 bg-[#2a2a2a] rounded-full"></div>
          <div className="w-32 h-5 bg-[#2a2a2a] rounded-md"></div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="w-full bg-[#1a1a1a] border-b border-[#2a2a2a] h-16 sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link href={user?.isAdmin ? "/admin" : "/recrutamento"} className="flex items-center gap-2 md:gap-3 group">
            <span className="material-symbols-outlined text-[#ff5500] text-3xl font-variation-settings-fill">
              mountain_flag
            </span>
            <div className="flex flex-col">
              <h1 className="font-display font-extrabold text-white text-base md:text-lg tracking-tight uppercase">
                LEGENDÁRIOS
              </h1>
              <span className="text-[10px] text-[#e0e0e0] font-semibold tracking-wider -mt-1 block">
                PORTAL DO SERVO
              </span>
            </div>
          </Link>

          {/* Navigation Links for standard coordinators */}
          {activeSector && (
            <nav className="hidden sm:flex items-center gap-4 border-l border-[#2a2a2a] pl-6 h-8">
              <Link
                href="/recrutamento"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                  pathname === "/recrutamento"
                    ? "bg-[#ff5500]/10 text-[#ff5500]"
                    : "text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a]"
                }`}
              >
                Fila de Recrutamento
              </Link>
              <Link
                href="/equipe"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                  pathname === "/equipe"
                    ? "bg-[#ff5500]/10 text-[#ff5500]"
                    : "text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a]"
                }`}
              >
                Minha Equipe
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Active Sector Indicator */}
          {activeSector && (
            <div className="hidden md:flex items-center gap-2 bg-[#2a2a2a] px-3.5 py-1.5 rounded-full border border-[#3a3a3a]">
              <span className="material-symbols-outlined text-[#ff5500] text-lg">
                {sectorIcons[activeSector.name] || "shield"}
              </span>
              <span className="text-xs font-semibold text-white">
                Setor: {activeSector.name}
              </span>
            </div>
          )}

          {user?.isAdmin && (
            <Link
              href="/admin"
              className="text-xs font-semibold bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a] text-white px-3.5 py-1.5 rounded-full transition-all"
            >
              Líder Geral (Admin)
            </Link>
          )}

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-[#2a2a2a] rounded-full text-[#e0e0e0] hover:text-white transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
            title={isDark ? "Ativar Tema Claro" : "Ativar Tema Escuro"}
          >
            <span className="material-symbols-outlined text-xl">
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>

          <div className="h-8 w-[1px] bg-[#2a2a2a] mx-1 hidden sm:block"></div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-[#2a2a2a] transition-all focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-[#ff5500]/20 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] font-bold text-sm">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-[#e0e0e0] pr-1">
                {user?.nome}
              </span>
              <span className="material-symbols-outlined text-[#e0e0e0] text-sm hidden sm:block">
                keyboard_arrow_down
              </span>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-4 py-2 border-b border-[#2a2a2a] mb-1">
                  <p className="text-xs text-secondary text-gray-400">Logado como</p>
                  <p className="text-sm font-semibold text-white truncate">{user?.nome}</p>
                  <p className="text-[11px] text-[#ff5500] font-medium truncate mt-0.5">
                    {activeSector ? `Setor: ${activeSector.name}` : "Nenhum setor ativo"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">sync_alt</span>
                  Mudar coordenação
                </button>

                {user?.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    Painel do Admin
                  </Link>
                )}

                <div className="h-[1px] bg-[#2a2a2a] my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sector Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2a] flex justify-between items-center bg-[#131313]">
              <div>
                <h3 className="font-display text-lg md:text-xl font-bold text-white">
                  Selecione o seu Setor Ativo
                </h3>
                <p className="text-xs text-[#e0e0e0] mt-1">
                  Qual departamento você está coordenando e recrutando servos?
                </p>
              </div>
              {activeSector && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-[#2a2a2a] rounded-full text-[#e0e0e0] hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[60vh] overflow-y-auto">
              {sectors.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSector({ id: s.id, name: s.name })}
                  className={`group p-4 border rounded-xl text-left flex items-start gap-3.5 transition-all duration-200 ${
                    activeSector?.id === s.id
                      ? "border-[#ff5500] bg-[#ff5500]/10"
                      : "border-[#2a2a2a] bg-[#131313] hover:border-[#ff5500]/40 hover:bg-[#2a2a2a]/30"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      activeSector?.id === s.id
                        ? "bg-[#ff5500] text-white"
                        : "bg-[#2a2a2a] text-[#ff5500] group-hover:bg-[#ff5500] group-hover:text-white"
                    }`}
                  >
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

            <div className="p-4 bg-[#131313] border-t border-[#2a2a2a] flex justify-end gap-3">
              {activeSector ? (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Sair do Portal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
