"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getSectors, 
  getAdminStats, 
  getSystemPhase, 
  updateSystemPhase, 
  updateSectorMeta, 
  importVolunteers,
  getRecruitedVolunteers,
  getAllVolunteers,
  updateVolunteer,
  toggleVolunteerBlock
} from "@/app/actions";

interface Sector {
  id: string;
  name: string;
  meta: number;
  allocatedCount: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [stats, setStats] = useState({ total: 0, allocated: 0, available: 0 });
  const [phase, setPhase] = useState("1");
  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ success: boolean; imported: number; skipped: number } | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [searchServant, setSearchServant] = useState("");
  const [editingVolunteer, setEditingVolunteer] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  // Load state and verify if user is Admin
  useEffect(() => {
    const storedUser = localStorage.getItem("coordinator_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (!parsed.isAdmin) {
      router.push("/recrutamento");
      return;
    }
    setUser(parsed);
    loadAllData();
  }, [router]);

  async function loadAllData() {
    setLoading(true);
    try {
      const sectorsRes = await getSectors();
      const statsRes = await getAdminStats();
      const phaseRes = await getSystemPhase();
      const volunteersRes = await getAllVolunteers();

      if (sectorsRes.success && sectorsRes.data) {
        setSectors(sectorsRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (phaseRes.success && phaseRes.phase) {
        setPhase(phaseRes.phase);
      }
      if (volunteersRes.success && volunteersRes.data) {
        setVolunteers(volunteersRes.data);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handlePhaseChange = async (newPhase: string) => {
    setPhase(newPhase);
    await updateSystemPhase(newPhase);
  };

  const handleUpdateMeta = async (sectorId: string, value: number) => {
    const res = await updateSectorMeta(sectorId, value);
    if (res.success) {
      setSectors(prev => prev.map(s => s.id === sectorId ? { ...s, meta: value } : s));
      // Reload stats
      const statsRes = await getAdminStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setCsvData(parsed);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    // Normalize headers: replace quotes and trim
    const headers = lines[0]
      .split(/[;,]/)
      .map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(/[;,]/).map(c => c.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = cols[index];
        let key = header;
        
        if (header.includes('nome') || header === 'name') key = 'nome';
        else if (header.includes('telefone') || header.includes('celular') || header === 'phone') key = 'telefone';
        else if (header.includes('email')) key = 'email';
        else if (header.includes('opcao1') || header.includes('opcao 1') || header.includes('opção 1')) key = 'opcao1';
        else if (header.includes('opcao2') || header.includes('opcao 2') || header.includes('opção 2')) key = 'opcao2';
        else if (header.includes('idade') || header === 'age') key = 'idade';
        else if (header.includes('igreja') || header === 'church') key = 'igreja';
        else if (header.includes('pastor')) key = 'nomePastor';
        else if (header.includes('telefone pastor') || header.includes('tel pastor')) key = 'telefonePastor';
        else if (header.includes('legendario') || header.includes('numero') || header.includes('número')) key = 'numeroLegendario';
        else if (header.includes('anotacoes') || header.includes('obs')) key = 'anotacoes';

        row[key] = value;
      });
      rows.push(row);
    }
    return rows;
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;
    setImporting(true);
    setImportResult(null);

    const res = await importVolunteers(csvData);
    if (res.success) {
      setImportResult({
        success: true,
        imported: res.importedCount ?? 0,
        skipped: res.skippedCount ?? 0
      });
      setCsvFile(null);
      setCsvData([]);
      loadAllData();
    } else {
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0
      });
    }
    setImporting(false);
  };

  const handleExportAll = async () => {
    // Generate CSV for all recruited volunteers
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Nome,Telefone,Email,Setor,Opcao 1,Opcao 2,Igreja,Numero Legendario\n";

      for (const sector of sectors) {
        const res = await getRecruitedVolunteers(sector.id);
        if (res.success && res.data) {
          res.data.forEach(v => {
            const row = [
              v.nome,
              v.telefone,
              v.email || "",
              sector.name,
              v.opcao1 || "",
              v.opcao2 || "",
              v.igreja || "",
              v.numeroLegendario || ""
            ].map(val => `"${val.replace(/"/g, '""')}"`).join(",");
            csvContent += row + "\n";
          });
        }
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "servos_alocados_legendarios.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("coordinator_user");
    localStorage.removeItem("active_sector");
    router.push("/login");
  };

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

  const handleToggleBlock = async (id: string, currentBlocked: boolean) => {
    // Tonalidade de feedback instantâneo no cliente
    const nextState = !currentBlocked;
    setVolunteers(prev => prev.map(v => v.id === id ? { ...v, bloqueado: nextState } : v));

    try {
      const res = await toggleVolunteerBlock(id, nextState);
      if (!res.success) {
        // Reverter se falhar no servidor
        setVolunteers(prev => prev.map(v => v.id === id ? { ...v, bloqueado: currentBlocked } : v));
        alert(res.error || "Erro ao alterar o estado de bloqueio no servidor.");
      } else {
        // Recarregar os dados consolidados em background
        loadAllData();
      }
    } catch (err: any) {
      // Reverter se falhar de conexão
      setVolunteers(prev => prev.map(v => v.id === id ? { ...v, bloqueado: currentBlocked } : v));
      alert("Erro ao conectar ao servidor: " + err.message);
    }
  };

  const handleOpenEdit = (v: any) => {
    setEditingVolunteer(v);
    setEditForm({
      nome: v.nome || "",
      telefone: v.telefone || "",
      email: v.email || "",
      opcao1: v.opcao1 || "",
      opcao2: v.opcao2 || "",
      idade: v.idade || "",
      dataNascimento: v.dataNascimento || "",
      igreja: v.igreja || "",
      nomePastor: v.nomePastor || "",
      telefonePastor: v.telefonePastor || "",
      numeroLegendario: v.numeroLegendario || "",
      quantidadeServicos: v.quantidadeServicos || 0,
      areasServidas: v.areasServidas || "",
      anotacoes: v.anotacoes || "",
      status: v.status || "Available",
      setorId: v.setorId || ""
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingVolunteer) return;
    setSavingEdit(true);
    setEditError(null);
    const res = await updateVolunteer(editingVolunteer.id, editForm);
    if (res.success) {
      setEditingVolunteer(null);
      loadAllData();
    } else {
      setEditError(res.error || "Erro ao salvar alterações.");
    }
    setSavingEdit(false);
  };

  const filteredVolunteers = volunteers.filter(v => 
    v.nome.toLowerCase().includes(searchServant.toLowerCase()) ||
    (v.telefone && v.telefone.includes(searchServant))
  );

  if (loading && sectors.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#121212] text-white">
        <span className="material-symbols-outlined animate-spin text-[#ff5500] text-4xl">sync</span>
      </div>
    );
  }

  const allocatedPercentage = stats.total > 0 ? Math.round((stats.allocated / stats.total) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-[#121212] text-white">
      {/* Side Navigation Bar */}
      <aside className="w-[260px] hidden md:flex flex-col bg-[#1a1a1a] border-r border-[#2a2a2a] fixed h-screen top-0 left-0 z-10 py-6">
        <div className="px-6 mb-10">
          <h1 className="font-display font-extrabold text-white text-lg tracking-tight uppercase">
            LEGENDÁRIOS
          </h1>
          <span className="text-[10px] text-[#ff5500] font-bold tracking-wider uppercase">
            Painel do Administrador
          </span>
        </div>

        <nav className="flex-grow space-y-1">
          <a className="bg-[#ff5500]/10 text-[#ff5500] border-l-4 border-[#ff5500] px-5 py-3.5 flex items-center gap-3 font-semibold text-sm transition-all" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </a>
          <a 
            className="text-[#e0e0e0] hover:bg-[#2a2a2a] hover:text-white px-5 py-3.5 flex items-center gap-3 text-sm transition-all border-l-4 border-transparent"
            href="#"
            onClick={() => {
              // Select first sector as mock active sector and go to recruitment
              if (sectors.length > 0) {
                localStorage.setItem("active_sector", JSON.stringify({ id: sectors[0].id, name: sectors[0].name }));
                router.push("/recrutamento");
              }
            }}
          >
            <span className="material-symbols-outlined">group_add</span>
            Fila de Recrutamento
          </a>
        </nav>

        <div className="px-5 mt-auto pt-4 border-t border-[#2a2a2a] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#ff5500]/20 flex items-center justify-center text-[#ff5500] font-bold text-sm">
              A
            </div>
            <div>
              <p className="text-xs font-bold text-white">Admin Geral</p>
              <p className="text-[10px] text-gray-500 font-medium">Líder de Equipes</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-[#2a2a2a] hover:bg-red-500/10 hover:text-red-400 text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Desconectar
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-grow md:ml-[260px] flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="h-16 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between px-6 sticky top-0 z-20">
          <h2 className="font-display font-extrabold text-white text-base md:text-lg tracking-tight uppercase">
            PORTAL DO SERVO
          </h2>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-[#2a2a2a] rounded-full text-[#e0e0e0] hover:text-white transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
              title={isDark ? "Ativar Tema Claro" : "Ativar Tema Escuro"}
            >
              <span className="material-symbols-outlined text-xl">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>

            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-[#ff5500] hover:text-[#ff6600] px-4 py-2 border border-[#ff5500]/20 hover:border-[#ff5500]/50 rounded-full transition-all cursor-pointer"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Visão Geral do Recrutamento
              </h2>
              <p className="text-sm text-[#e0e0e0] mt-0.5">
                Controle global de metas de alocação e gerenciamento de planilhas de servos.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleExportAll}
                className="flex items-center gap-2 border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#2a2a2a] px-4.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#ff5500] text-base">download</span>
                Exportar Listas Finais
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stat 1 */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 rounded-2xl flex items-center justify-between hover:border-[#ff5500]/20 transition-all">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Inscritos Totais</p>
                <h3 className="text-3xl font-display font-extrabold mt-1 text-white">{stats.total}</h3>
              </div>
              <div className="w-12 h-12 bg-[#2a2a2a] rounded-xl flex items-center justify-center text-[#ff5500]">
                <span className="material-symbols-outlined text-2xl">group</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 rounded-2xl flex flex-col justify-between hover:border-[#ff5500]/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Alocados / Recrutados</p>
                  <h3 className="text-3xl font-display font-extrabold mt-1 text-white">
                    {stats.allocated} <span className="text-sm font-normal text-gray-500">/ {stats.total}</span>
                  </h3>
                </div>
                <div className="w-12 h-12 bg-[#ff5500]/10 rounded-xl flex items-center justify-center text-[#ff5500]">
                  <span className="material-symbols-outlined text-2xl font-variation-settings-fill">assignment_turned_in</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff5500]" style={{ width: `${allocatedPercentage}%` }}></div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block text-right font-medium">
                  {allocatedPercentage}% alocados
                </span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 rounded-2xl flex items-center justify-between hover:border-[#ff5500]/20 transition-all">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Servos Disponíveis</p>
                <h3 className="text-3xl font-display font-extrabold mt-1 text-white">{stats.available}</h3>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                <span className="material-symbols-outlined text-2xl">person_add_alt</span>
              </div>
            </div>
          </div>

          {/* Phase Control and Importation Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Phase Switch Controller */}
            <div className="lg:col-span-1 bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-white text-base">Painel de Controle de Fases</h4>
                <p className="text-xs text-[#e0e0e0] mt-1.5 leading-relaxed">
                  Defina quais opções de escolha de setor serão disponibilizadas para os coordenadores nos formulários.
                </p>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handlePhaseChange("1")}
                    className={`w-full p-4 border rounded-xl text-left flex items-start gap-3 transition-all ${
                      phase === "1"
                        ? "border-[#ff5500] bg-[#ff5500]/5"
                        : "border-[#2a2a2a] hover:border-gray-700"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      phase === "1" ? "border-[#ff5500]" : "border-gray-500"
                    }`}>
                      {phase === "1" && <div className="w-2.5 h-2.5 bg-[#ff5500] rounded-full"></div>}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">FASE 1: 1ª Opção Apenas</span>
                      <span className="text-[10px] text-[#e0e0e0] block mt-0.5 leading-normal">
                        Coordenadores visualizam apenas candidatos que escolheram o setor como 1ª opção de serviço.
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handlePhaseChange("2")}
                    className={`w-full p-4 border rounded-xl text-left flex items-start gap-3 transition-all ${
                      phase === "2"
                        ? "border-[#ff5500] bg-[#ff5500]/5"
                        : "border-[#2a2a2a] hover:border-gray-700"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      phase === "2" ? "border-[#ff5500]" : "border-gray-500"
                    }`}>
                      {phase === "2" && <div className="w-2.5 h-2.5 bg-[#ff5500] rounded-full"></div>}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">FASE 2: Abrir 2ª Opção</span>
                      <span className="text-[10px] text-[#e0e0e0] block mt-0.5 leading-normal">
                        Habilita a exibição e seleção de servos que marcaram o setor como 2ª opção para preencher vagas ociosas.
                      </span>
                    </div>
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-[#2a2a2a] mt-6 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#ff5500] rounded-full animate-ping"></div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  Fase {phase} ativa no sistema
                </span>
              </div>
            </div>

            {/* Spreadsheet Importer */}
            <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-white text-base">Importação Incremental de Servos</h4>
                <p className="text-xs text-[#e0e0e0] mt-1.5 leading-relaxed">
                  Carregue listas de servos via CSV. O importador limpa duplicatas baseando-se no telefone.
                </p>

                {/* Dropzone */}
                <div className="mt-5 border-2 border-dashed border-[#2a2a2a] hover:border-[#ff5500]/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="material-symbols-outlined text-[#ff5500] text-3xl mb-2">upload_file</span>
                  {csvFile ? (
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-sm mx-auto">{csvFile.name}</p>
                      <p className="text-[10px] text-green-400 mt-1 font-semibold">{csvData.length} registros prontos para importar</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-[#e0e0e0]">Arraste ou selecione o arquivo CSV</p>
                      <p className="text-[10px] text-gray-500 mt-1">Colunas sugeridas: Nome, Telefone, Email, Opcao1, Opcao2, Igreja</p>
                    </div>
                  )}
                </div>

                {importResult && (
                  <div className={`mt-4 p-3.5 border rounded-xl flex items-center gap-3 ${
                    importResult.success 
                      ? "bg-green-500/10 border-green-500/30 text-green-400" 
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {importResult.success ? "check_circle" : "error"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">
                        {importResult.success ? "Importação concluída" : "Falha na importação"}
                      </p>
                      <p className="text-[10px] opacity-80 mt-0.5 leading-tight">
                        {importResult.imported} adicionados, {importResult.skipped} duplicados ou pulados.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
                {csvFile && (
                  <button
                    onClick={() => { setCsvFile(null); setCsvData([]); setImportResult(null); }}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold text-[#e0e0e0] hover:bg-[#2a2a2a] transition-all cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={handleImport}
                  disabled={csvData.length === 0 || importing}
                  className="bg-[#ff5500] hover:bg-[#ff6600] disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#ff5500]/10 transition-all cursor-pointer"
                >
                  {importing ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Processando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                      Processar Importação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sectors Goal Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#2a2a2a]">
              <h4 className="font-display font-bold text-white text-base">Metas e Alocações por Setor</h4>
              <p className="text-xs text-[#e0e0e0] mt-0.5">Monitore alocações e ajuste as quotas de vagas para cada departamento.</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sectors.map((s) => {
                const percent = s.meta > 0 ? Math.min(Math.round((s.allocatedCount / s.meta) * 100), 100) : 0;
                return (
                  <div key={s.id} className="bg-[#131313] border border-[#2a2a2a] rounded-xl p-4.5 space-y-3.5 hover:border-[#ff5500]/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#2a2a2a] text-[#ff5500] rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-xl">
                            {sectorIcons[s.name] || "shield"}
                          </span>
                        </div>
                        <div>
                          <h5 className="font-display font-bold text-sm text-white">{s.name}</h5>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">Setor</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white">{s.allocatedCount}</span>
                        <span className="text-xs text-gray-500"> / {s.meta} alocados</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#ff5500]" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="text-[9px] text-[#ff5500] font-bold block text-right">
                        {percent}% da meta
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#2a2a2a] flex items-center justify-between gap-4">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Meta Vagas</label>
                      <div className="flex items-center gap-2 max-w-[120px]">
                        <input
                          type="number"
                          defaultValue={s.meta}
                          min={0}
                          onBlur={(e) => handleUpdateMeta(s.id, Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateMeta(s.id, Number((e.target as HTMLInputElement).value));
                            }
                          }}
                          className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-center text-xs text-white focus:border-[#ff5500]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* General Servants Directory */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#2a2a2a] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-display font-bold text-white text-base">Diretório Geral de Servos</h4>
                <p className="text-xs text-[#e0e0e0] mt-0.5">Gerencie o cadastro, edite informações, opções de setor e configure bloqueios de elegibilidade.</p>
              </div>
              <div className="relative w-full md:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchServant}
                  onChange={(e) => setSearchServant(e.target.value)}
                  placeholder="Pesquisar servo por nome..."
                  className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:border-[#ff5500] focus:ring-0 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-gray-500 uppercase tracking-wider text-[10px] font-bold bg-[#131313]/50">
                    <th className="py-4 px-5">Nome</th>
                    <th className="py-4 px-5">Telefone</th>
                    <th className="py-4 px-5">Opções</th>
                    <th className="py-4 px-5">Igreja</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {filteredVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 italic">
                        Nenhum servo encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredVolunteers.map((v) => (
                      <tr key={v.id} className="hover:bg-[#202020]/30 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{v.nome}</span>
                            {v.bloqueado && (
                              <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight flex items-center gap-1 border border-red-500/20">
                                <span className="material-symbols-outlined text-[10px]">block</span>
                                Bloqueado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-gray-300 font-semibold">{v.telefone}</td>
                        <td className="py-4 px-5 text-gray-300">
                          <div className="space-y-0.5">
                            <span className="text-[10px] block font-bold text-[#ff5500]">1ª: {v.opcao1 || "—"}</span>
                            <span className="text-[10px] block text-gray-500 font-medium">2ª: {v.opcao2 || "—"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-gray-300">{v.igreja || "—"}</td>
                        <td className="py-4 px-5">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            v.status === "Recruited"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-gray-800 text-gray-400 border border-gray-700"
                          }`}>
                            {v.status === "Recruited" ? `Alocado (${v.setor?.name || "Setor"})` : "Disponível"}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="border border-[#2a2a2a] hover:border-[#ff5500]/50 hover:bg-[#ff5500]/10 text-gray-300 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleBlock(v.id, v.bloqueado)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase border transition-colors cursor-pointer ${
                              v.bloqueado
                                ? "bg-green-600/10 hover:bg-green-600 border-green-500/20 hover:border-green-500 text-green-400 hover:text-white"
                                : "bg-red-600/10 hover:bg-red-600 border-red-500/20 hover:border-red-500 text-red-400 hover:text-white"
                            }`}
                          >
                            {v.bloqueado ? "Desbloquear" : "Bloquear"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Editing Servant Dialog Modal */}
      {editingVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2a] bg-[#131313] flex justify-between items-center">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Editar Ficha do Servo</h3>
                <p className="text-xs text-[#e0e0e0] mt-1">Ajuste os dados pessoais, de contato e preferências de setor do servo.</p>
              </div>
              <button
                onClick={() => setEditingVolunteer(null)}
                className="p-1 hover:bg-[#2a2a2a] rounded-full text-[#e0e0e0] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed flex-grow">
              {editError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-bold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Nome do Servo</label>
                  <input
                    type="text"
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                    required
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Telefone</label>
                  <input
                    type="text"
                    value={editForm.telefone}
                    onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                    required
                  />
                </div>

                {/* Opcao 1 */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">1ª Opção de Setor</label>
                  <select
                    value={editForm.opcao1}
                    onChange={(e) => setEditForm({ ...editForm, opcao1: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none cursor-pointer"
                  >
                    <option value="">Nenhuma</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Opcao 2 */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">2ª Opção de Setor</label>
                  <select
                    value={editForm.opcao2}
                    onChange={(e) => setEditForm({ ...editForm, opcao2: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none cursor-pointer"
                  >
                    <option value="">Nenhuma</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Idade */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Idade</label>
                  <input
                    type="number"
                    value={editForm.idade}
                    onChange={(e) => setEditForm({ ...editForm, idade: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Data de Nascimento */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Data de Nascimento</label>
                  <input
                    type="text"
                    value={editForm.dataNascimento}
                    onChange={(e) => setEditForm({ ...editForm, dataNascimento: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Igreja */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Igreja</label>
                  <input
                    type="text"
                    value={editForm.igreja}
                    onChange={(e) => setEditForm({ ...editForm, igreja: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Numero Legendario */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Número do Legendário</label>
                  <input
                    type="text"
                    value={editForm.numeroLegendario}
                    onChange={(e) => setEditForm({ ...editForm, numeroLegendario: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Nome Pastor */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Nome do Pastor</label>
                  <input
                    type="text"
                    value={editForm.nomePastor}
                    onChange={(e) => setEditForm({ ...editForm, nomePastor: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Telefone Pastor */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Telefone do Pastor</label>
                  <input
                    type="text"
                    value={editForm.telefonePastor}
                    onChange={(e) => setEditForm({ ...editForm, telefonePastor: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Quantidade Servicos */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Vezes que serviu (Tops)</label>
                  <input
                    type="number"
                    value={editForm.quantidadeServicos}
                    onChange={(e) => setEditForm({ ...editForm, quantidadeServicos: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">E-mail</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Areas Servidas */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Áreas em que já serviu</label>
                  <input
                    type="text"
                    value={editForm.areasServidas}
                    onChange={(e) => setEditForm({ ...editForm, areasServidas: e.target.value })}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none"
                  />
                </div>

                {/* Anotacoes */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Anotações Internas</label>
                  <textarea
                    value={editForm.anotacoes}
                    onChange={(e) => setEditForm({ ...editForm, anotacoes: e.target.value })}
                    rows={3}
                    className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-white focus:border-[#ff5500] outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#131313] border-t border-[#2a2a2a] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingVolunteer(null)}
                className="px-5 py-2.5 text-xs font-semibold text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="bg-[#ff5500] hover:bg-[#ff6600] disabled:opacity-40 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#ff5500]/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {savingEdit ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
