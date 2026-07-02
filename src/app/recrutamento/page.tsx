"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { 
  getVolunteers, 
  claimVolunteer, 
  updateVolunteerNotes, 
  getRecruitedVolunteers,
  getSectors,
  updateSectorMeta,
  getSystemPhase
} from "@/app/actions";

interface Volunteer {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  opcao1: string | null;
  opcao2: string | null;
  idade: number | null;
  dataNascimento: string | null;
  igreja: string | null;
  quantidadeServicos: number;
  areasServidas: string | null;
  nomePastor: string | null;
  telefonePastor: string | null;
  numeroLegendario: string | null;
  anotacoes: string | null;
  status: string;
  bloqueado: boolean;
  instagram?: string | null;
  fotoUrl?: string | null;
}

export default function RecrutamentoPage() {
  const router = useRouter();
  const [activeSector, setActiveSector] = useState<{ id: string; name: string } | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  
   // Search & Filter state
  const [search, setSearch] = useState("");
  const [church, setChurch] = useState("Todas");
  const [priority, setPriority] = useState("Alta (1ª Opção)");
  const [churchesList, setChurchesList] = useState<string[]>([]);
  
  // Sector stats
  const [allocatedCount, setAllocatedCount] = useState(0);
  const [sectorMeta, setSectorMeta] = useState(10);
  const [tempMeta, setTempMeta] = useState(10);
  
  const [phase, setPhase] = useState("1");
  
  // Drawer state
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const storedSector = localStorage.getItem("active_sector");
    if (storedSector) {
      setActiveSector(JSON.parse(storedSector));
    } else {
      // Sector selection will pop up via Header or they will be prompted
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSector) {
      loadVolunteersAndStats();
    }
  }, [activeSector, search, church, priority]);

  async function loadVolunteersAndStats() {
    if (!activeSector) return;
    setLoading(true);
    try {
      // Fetch system phase
      const phaseRes = await getSystemPhase();
      if (phaseRes.success && phaseRes.phase) {
        setPhase(phaseRes.phase);
      }

      // Fetch stats
      const sectorsRes = await getSectors();
      if (sectorsRes.success && sectorsRes.data) {
        const currentSector = sectorsRes.data.find(s => s.id === activeSector.id);
        if (currentSector) {
          setAllocatedCount(currentSector.allocatedCount);
          setSectorMeta(currentSector.meta);
          setTempMeta(currentSector.meta);
        }
      }

      // Fetch candidates list
      const volunteersRes = await getVolunteers(activeSector.id, search, church, priority);
      if (volunteersRes.success && volunteersRes.data) {
        const list = volunteersRes.data as Volunteer[];
        setVolunteers(list);
        
        // Extract unique churches for dropdown filter dynamically
        const uniqueChurches = Array.from(
          new Set(list.map(v => v.igreja).filter((c): c is string => !!c && c.trim() !== ""))
        );
        // Consolidate with existing list so filters don't shrink too much
        setChurchesList(prev => {
          const combined = new Set([...prev, ...uniqueChurches]);
          return Array.from(combined).sort();
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveMeta = async () => {
    if (!activeSector) return;
    setActionError(null);
    setActionSuccess(null);
    
    const res = await updateSectorMeta(activeSector.id, tempMeta);
    if (res.success) {
      setSectorMeta(tempMeta);
      setActionSuccess("Meta de vagas atualizada com sucesso!");
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      setActionError(res.error || "Erro ao atualizar meta de vagas.");
    }
  };

  const handleRecrutar = async (vId: string) => {
    if (!activeSector) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await claimVolunteer(vId, activeSector.id);
    if (res.success) {
      setActionSuccess(`Servo recrutado com sucesso!`);
      setSelectedVolunteer(null);
      loadVolunteersAndStats();
      
      // Auto dismiss success toast after 3 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } else {
      setActionError(res.error || "Não foi possível recrutar.");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedVolunteer) return;
    setSavingNotes(true);
    setNotesSuccess(false);

    const res = await updateVolunteerNotes(selectedVolunteer.id, notes);
    if (res.success) {
      setNotesSuccess(true);
      setSelectedVolunteer(prev => prev ? { ...prev, anotacoes: notes } : null);
      // Refresh list to persist notes changes
      setVolunteers(prev => prev.map(v => v.id === selectedVolunteer.id ? { ...v, anotacoes: notes } : v));
      setTimeout(() => setNotesSuccess(false), 2000);
    }
    setSavingNotes(false);
  };

  const openDrawer = (v: Volunteer) => {
    setSelectedVolunteer(v);
    setNotes(v.anotacoes || "");
    setNotesSuccess(false);
  };

  const formatWhatsAppLink = (phone: string, name: string) => {
    const text = encodeURIComponent(`Olá ${name}, aqui é o coordenador do setor ${activeSector?.name || ""} dos Legendários!`);
    const cleaned = phone.replace(/\D/g, "");
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${text}`;
  };

  const occupancyPercent = sectorMeta > 0 ? Math.min(Math.round((allocatedCount / sectorMeta) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans pb-28 sm:pb-16">
      <Header />

      <main className="pt-8 px-4 md:px-8 max-w-4xl mx-auto space-y-6">
        
        {/* Active Sector Occupancy Banner */}
        {activeSector ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-4">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Setor Ativo em Foco</span>
                <h2 className="font-display text-2xl font-black text-[#ff5500] flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-[#ff5500] text-3xl font-variation-settings-fill">
                    shield
                  </span>
                  {activeSector.name}
                </h2>
              </div>
              <div className="flex items-center gap-5 self-end sm:self-auto">
                <div className="text-left">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Meta de Vagas</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={tempMeta}
                      onChange={(e) => setTempMeta(Number(e.target.value))}
                      className="bg-[#131313] border border-[#2a2a2a] text-white text-xs font-bold py-2 px-2.5 rounded-xl w-16 focus:border-[#ff5500] focus:ring-0 outline-none text-center"
                    />
                    <button
                      onClick={handleSaveMeta}
                      className="p-2 bg-[#ff5500]/10 hover:bg-[#ff5500] border border-[#ff5500]/20 hover:border-[#ff5500] rounded-xl text-[#ff5500] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                      title="Salvar Meta"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">check</span>
                    </button>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Opção na Fila</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="bg-[#131313] border border-[#2a2a2a] text-white text-xs font-bold py-2 px-3.5 rounded-xl focus:border-[#ff5500] focus:ring-0 cursor-pointer outline-none shadow-md"
                  >
                    <option value="Alta (1ª Opção)">1ª Opção</option>
                    <option value="Média (2ª Opção)">2ª Opção</option>
                  </select>
                </div>
                <div className="text-right">
                  <span className="text-xl font-display font-extrabold text-[#ff5500]">
                    {allocatedCount} <span className="text-xs font-normal text-gray-500">/ {sectorMeta}</span>
                  </span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Vagas Alocadas</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="h-full bg-[#ff5500] transition-all duration-500" style={{ width: `${occupancyPercent}%` }}></div>
              </div>
              <span className="text-[10px] text-[#ff5500] font-bold block text-right">
                {occupancyPercent}% da meta alcançada
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl text-center">
            <span className="material-symbols-outlined text-4xl text-[#ff5500] mb-2 animate-bounce">sync_alt</span>
            <p className="text-sm font-semibold text-white">Por favor, selecione um setor ativo no menu superior para iniciar.</p>
          </div>
        )}

        {activeSector && (
          <>
            {/* Action Feedback Banner */}
            {actionSuccess && (
              <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="material-symbols-outlined text-green-400">check_circle</span>
                <p className="text-xs text-green-300 font-semibold">{actionSuccess}</p>
              </div>
            )}
            {actionError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="material-symbols-outlined text-red-400">error</span>
                <p className="text-xs text-red-300 font-semibold">{actionError}</p>
              </div>
            )}

            {/* Toolbar Filters */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center">
              
              {/* Search input */}
              <div className="relative w-full md:flex-grow">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Busca rápida por nome de candidato..."
                  className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl py-2.5 pl-10 pr-4 text-xs placeholder-gray-600 focus:border-[#ff5500] focus:ring-0"
                />
              </div>

              {/* Church filter dropdown */}
              <div className="w-full md:w-56 flex-shrink-0">
                <select
                  value={church}
                  onChange={(e) => setChurch(e.target.value)}
                  className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl py-2.5 px-3 text-xs focus:border-[#ff5500] focus:ring-0 cursor-pointer"
                >
                  <option value="Todas">Igreja: Todas</option>
                  {churchesList.map((ch, idx) => (
                    <option key={idx} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila Candidates List */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Fila de Candidatos Disponíveis
                </h3>
                <span className="text-xs text-gray-500 font-semibold">
                  {volunteers.length} candidatos na fila
                </span>
              </div>

              {loading && volunteers.length === 0 ? (
                <div className="p-12 text-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
                  <span className="material-symbols-outlined animate-spin text-[#ff5500] text-3xl">sync</span>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Buscando na base de dados...</p>
                </div>
              ) : volunteers.length === 0 ? (
                <div className="p-12 text-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl space-y-2">
                  <span className="material-symbols-outlined text-4xl text-gray-600">group_off</span>
                  <p className="text-sm font-semibold text-white">Nenhum candidato encontrado</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Não há novos servos disponíveis para as opções de filtros marcadas na fase atual do recrutamento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {volunteers.map((v) => {
                    const isFirstOption = v.opcao1 === activeSector.name;
                    return (
                      <div
                        key={v.id}
                        onClick={() => openDrawer(v)}
                        className="group bg-[#1a1a1a] hover:bg-[#202020] border border-[#2a2a2a] hover:border-[#ff5500]/40 p-4.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar image / icon */}
                          {v.fotoUrl ? (
                            <img
                              src={v.fotoUrl}
                              alt={v.nome}
                              className="w-11 h-11 rounded-xl object-cover border border-[#2a2a2a] group-hover:border-[#ff5500]/40 flex-shrink-0 transition-colors"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 bg-[#2a2a2a] group-hover:bg-[#ff5500]/10 text-gray-400 group-hover:text-[#ff5500] rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                              <span className="material-symbols-outlined text-[22px]">person</span>
                            </div>
                          )}
                          
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-display font-bold text-sm text-white truncate max-w-[200px] md:max-w-xs">
                                {v.nome}
                              </h4>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-tighter ${
                                isFirstOption 
                                  ? "bg-[#ff5500]/15 text-[#ff5500]" 
                                  : "bg-gray-800 text-gray-400"
                              }`}>
                                {isFirstOption ? "1ª Opção" : "2ª Opção"}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-gray-500 mt-1 text-[11px] font-semibold">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] -mt-0.5">calendar_today</span>
                                {v.idade ? `${v.idade} anos` : "N/D"}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] -mt-0.5">church</span>
                                {v.igreja || "Sem igreja"}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] -mt-0.5">history</span>
                                serviu {v.quantidadeServicos === 3 ? 'três ou mais' : v.quantidadeServicos} {v.quantidadeServicos === 1 ? 'vez' : 'vezes'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={formatWhatsAppLink(v.telefone, v.nome)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 border border-[#2a2a2a] hover:border-green-500/50 text-gray-400 hover:text-green-400 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">chat</span>
                          </a>
                          
                          {v.bloqueado ? (
                            <span 
                              className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1"
                              title="Servo não atendeu aos requisitos da coordenação"
                            >
                              <span className="material-symbols-outlined text-xs">block</span>
                              Bloqueado
                            </span>
                          ) : (priority === "Média (2ª Opção)" && phase === "1") ? (
                            <span 
                              className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1"
                              title="2ª Opção indisponível (Fase 2 não habilitada)"
                            >
                              <span className="material-symbols-outlined text-xs">lock</span>
                              Bloqueado (Fase 1)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRecrutar(v.id)}
                              className="bg-[#ff5500] hover:bg-[#ff6600] text-white text-xs font-bold px-4 py-2 rounded-lg tracking-wide uppercase transition-all shadow-md shadow-[#ff5500]/5 cursor-pointer active:scale-95"
                            >
                              Recrutar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Centered detailed candidate profile Modal */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

            {/* Header info */}
            <div className="px-6 pb-4 border-b border-[#2a2a2a] flex justify-between items-start bg-[#131313] pt-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar Image / Silhouette placeholder */}
                {selectedVolunteer.fotoUrl ? (
                  <img
                    src={selectedVolunteer.fotoUrl}
                    alt={selectedVolunteer.nome}
                    className="w-12 h-12 rounded-xl object-cover border border-[#3a3a3a] flex-shrink-0 shadow-inner"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                    <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white truncate">
                      {selectedVolunteer.nome}
                    </h3>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-tighter ${
                      selectedVolunteer.opcao1 === activeSector?.name
                        ? "bg-[#ff5500]/15 text-[#ff5500]"
                        : "bg-gray-800 text-gray-400"
                    }`}>
                      {selectedVolunteer.opcao1 === activeSector?.name ? "1ª Opção" : "2ª Opção"}
                    </span>
                  </div>
                  <p className="text-xs text-[#e0e0e0] mt-1 font-semibold">
                    Igreja: {selectedVolunteer.igreja || "Sem igreja"} • Idade: {selectedVolunteer.idade ? `${selectedVolunteer.idade} anos` : "N/D"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVolunteer(null)}
                className="p-1 hover:bg-[#2a2a2a] rounded-full text-[#e0e0e0] hover:text-white transition-colors ml-4"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Contact Card */}
                <div className="bg-[#131313] border border-[#2a2a2a] p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Contato do Servo</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="material-symbols-outlined text-sm text-[#ff5500]">phone</span>
                      <span className="text-xs font-semibold text-white">{selectedVolunteer.telefone}</span>
                    </div>
                  </div>
                  <a
                    href={formatWhatsAppLink(selectedVolunteer.telefone, selectedVolunteer.nome)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600/10 hover:bg-green-600 border border-green-500/20 hover:border-green-500 text-green-400 hover:text-white text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.012 1.985c-5.503 0-9.978 4.475-9.978 9.978 0 1.764.462 3.491 1.336 5.02L2.012 22l5.143-1.348a9.92 9.92 0 0 0 4.857 1.258c5.503 0 9.978-4.475 9.978-9.978 0-2.66-1.036-5.161-2.918-7.042A9.919 9.919 0 0 0 12.012 1.985m5.922 13.914c-.244.686-1.22 1.25-1.677 1.299-.44.048-.89.068-2.833-.695-2.483-.974-4.086-3.5-4.208-3.663-.122-.163-1.025-1.365-1.025-2.602 0-1.237.65-1.848.878-2.093.228-.245.508-.306.678-.306.17 0 .34.008.489.015.155.007.363-.057.568.441.209.508.718 1.748.78 1.872.062.124.103.27.02.439-.082.169-.124.275-.245.415-.122.14-.257.311-.367.418-.12.116-.245.244-.105.485.14.24.621 1.022 1.333 1.656.918.818 1.69 1.07 1.93 1.19.24.12.381.102.524-.06.142-.163.61-.71.773-.951.163-.24.326-.2.548-.12.222.08 1.407.663 1.652.785.244.12.408.18.468.283.061.103.061.597-.184 1.283"/>
                    </svg>
                    Abrir WhatsApp
                  </a>
                  {(selectedVolunteer.email || selectedVolunteer.instagram) && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-[#2a2a2a]">
                      {selectedVolunteer.email && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-[#ff5500]">mail</span>
                          <span className="text-xs font-semibold text-white truncate block">{selectedVolunteer.email}</span>
                        </div>
                      )}
                      {selectedVolunteer.instagram && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-[#ff5500]">alternate_email</span>
                          <a
                            href={`https://instagram.com/${selectedVolunteer.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#ff5500] hover:underline"
                          >
                            @{selectedVolunteer.instagram.replace('@', '')}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pastor / Church Card */}
                <div className="bg-[#131313] border border-[#2a2a2a] p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pastor de Referência</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="material-symbols-outlined text-sm text-gray-400">person</span>
                      <span className="text-xs font-semibold text-white">{selectedVolunteer.nomePastor || "Não cadastrado"}</span>
                    </div>
                    {selectedVolunteer.telefonePastor && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">phone</span>
                        <span className="text-xs font-semibold text-white">{selectedVolunteer.telefonePastor}</span>
                      </div>
                    )}
                  </div>
                  {selectedVolunteer.telefonePastor ? (
                    <a
                      href={formatWhatsAppLink(selectedVolunteer.telefonePastor, selectedVolunteer.nomePastor || "Pastor")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-green-600/10 hover:bg-green-600 border border-green-500/20 hover:border-green-500 text-green-400 hover:text-white text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.012 1.985c-5.503 0-9.978 4.475-9.978 9.978 0 1.764.462 3.491 1.336 5.02L2.012 22l5.143-1.348a9.92 9.92 0 0 0 4.857 1.258c5.503 0 9.978-4.475 9.978-9.978 0-2.66-1.036-5.161-2.918-7.042A9.919 9.919 0 0 0 12.012 1.985m5.922 13.914c-.244.686-1.22 1.25-1.677 1.299-.44.048-.89.068-2.833-.695-2.483-.974-4.086-3.5-4.208-3.663-.122-.163-1.025-1.365-1.025-2.602 0-1.237.65-1.848.878-2.093.228-.245.508-.306.678-.306.17 0 .34.008.489.015.155.007.363-.057.568.441.209.508.718 1.748.78 1.872.062.124.103.27.02.439-.082.169-.124.275-.245.415-.122.14-.257.311-.367.418-.12.116-.245.244-.105.485.14.24.621 1.022 1.333 1.656.918.818 1.69 1.07 1.93 1.19.24.12.381.102.524-.06.142-.163.61-.71.773-.951.163-.24.326-.2.548-.12.222.08 1.407.663 1.652.785.244.12.408.18.468.283.061.103.061.597-.184 1.283"/>
                      </svg>
                      Abrir WhatsApp
                    </a>
                  ) : (
                    <div className="text-[11px] text-gray-500 italic py-2 text-center border border-[#2a2a2a]/50 rounded-lg">Sem telefone do pastor</div>
                  )}
                </div>

                {/* Preferences and Services History */}
                <div className="sm:col-span-2 bg-[#131313] border border-[#2a2a2a] p-4 rounded-xl space-y-3">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Histórico de Serviço LGND</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">Vezes que serviu</span>
                      <span className="text-sm font-bold text-white">serviu {selectedVolunteer.quantidadeServicos === 3 ? "três ou mais" : selectedVolunteer.quantidadeServicos} {selectedVolunteer.quantidadeServicos === 1 ? "Top" : "Tops"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">Opções de Setor</span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        1ª Opção: {selectedVolunteer.opcao1 || "Nenhuma"}
                      </span>
                      <span className="text-xs font-medium text-gray-400 block">
                        2ª Opção: {selectedVolunteer.opcao2 || "Nenhuma"}
                      </span>
                    </div>
                  </div>
                  {selectedVolunteer.areasServidas && (
                    <div className="pt-2 border-t border-[#2a2a2a]">
                      <span className="text-[10px] text-gray-400 block font-semibold">Áreas em que já serviu</span>
                      <p className="text-xs text-white font-medium mt-1 leading-normal">
                        {selectedVolunteer.areasServidas}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinator Notes Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Anotações Internas do Coordenador
                  </label>
                  {notesSuccess && (
                    <span className="text-[10px] text-green-400 font-bold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">done</span> Salvo!
                    </span>
                  )}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva anotações sobre a entrevista com o servo, restrições médicas, observações de comportamento, etc..."
                  className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:border-[#ff5500] focus:ring-0 h-28 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs font-bold px-4.5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingNotes ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">save</span>
                        Salvar Anotações
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-[#131313] border-t border-[#2a2a2a] flex justify-between items-center">
              <Link
                href={`/servos/${selectedVolunteer.id}`}
                className="px-5 py-2.5 border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff5500] hover:text-[#ff6600] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">info</span>
                Mais Informações
              </Link>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVolunteer(null)}
                  className="px-5 py-2.5 text-xs font-semibold text-[#e0e0e0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  Voltar à Fila
                </button>
                
                {selectedVolunteer.bloqueado ? (
                  <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-xs font-bold animate-pulse">
                    <span className="material-symbols-outlined text-sm">block</span>
                    <span>Servo não atendeu aos requisitos da coordenação.</span>
                  </div>
                ) : (priority === "Média (2ª Opção)" && phase === "1") ? (
                  <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span>Recrutamento de 2ª Opção indisponível (Fase 2 não habilitada).</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRecrutar(selectedVolunteer.id)}
                    className="bg-[#ff5500] hover:bg-[#ff6600] text-white text-xs font-bold px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-lg shadow-[#ff5500]/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    Recrutar para a Equipe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
