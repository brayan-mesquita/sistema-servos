"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { 
  getRecruitedVolunteers, 
  releaseVolunteer, 
  getSectors 
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
  instagram?: string | null;
  fotoUrl?: string | null;
}

export default function EquipePage() {
  const router = useRouter();
  const [activeSector, setActiveSector] = useState<{ id: string; name: string } | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sector occupancy and meta
  const [allocatedCount, setAllocatedCount] = useState(0);
  const [sectorMeta, setSectorMeta] = useState(10);
  
  // Feedback states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const storedSector = localStorage.getItem("active_sector");
    if (storedSector) {
      setActiveSector(JSON.parse(storedSector));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSector) {
      loadTeamData();
    }
  }, [activeSector]);

  async function loadTeamData() {
    if (!activeSector) return;
    setLoading(true);
    try {
      // Get sector quota and meta
      const sectorsRes = await getSectors();
      if (sectorsRes.success && sectorsRes.data) {
        const currentSector = sectorsRes.data.find(s => s.id === activeSector.id);
        if (currentSector) {
          setAllocatedCount(currentSector.allocatedCount);
          setSectorMeta(currentSector.meta);
        }
      }

      // Get allocated volunteers
      const teamRes = await getRecruitedVolunteers(activeSector.id);
      if (teamRes.success && teamRes.data) {
        setVolunteers(teamRes.data as Volunteer[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleLiberar = async (vId: string) => {
    setActionError(null);
    setActionSuccess(null);

    const res = await releaseVolunteer(vId);
    if (res.success) {
      setActionSuccess(`Servo liberado da equipe e devolvido ao pool.`);
      loadTeamData();
      
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } else {
      setActionError(res.error || "Erro ao liberar servo.");
    }
  };

  const handleExportCSV = () => {
    if (volunteers.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nome,Telefone,Email,Igreja,Numero Legendario,Anotacoes\n";

    volunteers.forEach(v => {
      const row = [
        v.nome,
        v.telefone,
        v.email || "",
        v.igreja || "",
        v.numeroLegendario || "",
        v.anotacoes || ""
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `equipe_${activeSector?.name.toLowerCase()}_legendarios.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const occupancyPercent = sectorMeta > 0 ? Math.min(Math.round((allocatedCount / sectorMeta) * 100), 100) : 0;

  const formatWhatsAppLink = (phone: string, name: string) => {
    const text = encodeURIComponent(`Olá ${name}, aqui é o coordenador do setor ${activeSector?.name || ""} dos Legendários!`);
    const cleaned = phone.replace(/\D/g, "");
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${text}`;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans pb-28 sm:pb-16 print:bg-white print:text-black">
      
      {/* Hide Header on print */}
      <div className="print:hidden">
        <Header />
      </div>

      <main className="pt-8 px-4 md:px-8 max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 print:border-b print:pb-4">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider print:hidden">Visualização da Equipe</span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white print:text-black tracking-tight mt-1">
              Minha Equipe - {activeSector?.name || "..."}
            </h2>
            <p className="text-sm text-[#e0e0e0] print:text-gray-600 mt-0.5">
              Servos recrutados e confirmados para a coordenação ativa.
            </p>
          </div>
          
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handleExportCSV}
              disabled={volunteers.length === 0}
              className="flex items-center gap-2 border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#2a2a2a] px-4 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-green-400 text-base">grid_on</span>
              Exportar Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={volunteers.length === 0}
              className="flex items-center gap-2 border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#2a2a2a] px-4 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-red-400 text-base">picture_as_pdf</span>
              Imprimir / PDF
            </button>
          </div>
        </div>

        {activeSector ? (
          <>
            {/* Quick stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ff5500]/10 text-[#ff5500] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">groups</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total da Equipe</p>
                  <h4 className="text-lg font-display font-extrabold text-white mt-0.5">{allocatedCount} servos</h4>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ff5500]/10 text-[#ff5500] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">checklist</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Meta de Alocação</p>
                  <h4 className="text-lg font-display font-extrabold text-white mt-0.5">{occupancyPercent}%</h4>
                </div>
              </div>

              <div className="bg-[#ff5500]/5 border border-[#ff5500]/20 p-4.5 rounded-2xl flex flex-col justify-center">
                <p className="text-[10px] text-[#ff5500] font-bold uppercase tracking-wider">Próximo Desafio</p>
                <h4 className="text-xs font-semibold text-white mt-0.5 truncate">Legendários</h4>
              </div>
            </div>

            {/* Action Feedback Banner */}
            {actionSuccess && (
              <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 print:hidden">
                <span className="material-symbols-outlined text-green-400">check_circle</span>
                <p className="text-xs text-green-300 font-semibold">{actionSuccess}</p>
              </div>
            )}
            {actionError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 print:hidden">
                <span className="material-symbols-outlined text-red-400">error</span>
                <p className="text-xs text-red-300 font-semibold">{actionError}</p>
              </div>
            )}

            {/* Recruited Team Table List */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden print:border-none print:bg-white">
              <div className="p-5 border-b border-[#2a2a2a] flex justify-between items-center print:hidden">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Lista de Servos Recrutados
                </h3>
                <span className="text-[10px] bg-[#2a2a2a] text-white px-2.5 py-1 rounded-full font-bold uppercase">
                  CONFIRMADOS
                </span>
              </div>

              {volunteers.length === 0 ? (
                <div className="p-12 text-center space-y-2 print:text-black">
                  <span className="material-symbols-outlined text-4xl text-gray-600">group_off</span>
                  <p className="text-sm font-semibold text-white print:text-black">Nenhum servo escalado</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Você ainda não recrutou servos na Fila de Recrutamento. Os servos alocados aparecerão nesta tabela.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a2a2a] text-gray-500 uppercase tracking-wider text-[10px] font-bold bg-[#131313]/50 print:bg-gray-100 print:text-gray-700 print:border-gray-300">
                        <th className="py-4 px-5">Nome</th>
                        <th className="py-4 px-5">Telefone</th>
                        <th className="py-4 px-5">Igreja</th>
                        <th className="py-4 px-5">Nº Legendário</th>
                        <th className="py-4 px-5 max-w-xs">Anotações</th>
                        <th className="py-4 px-5 text-right print:hidden">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a] print:divide-gray-200">
                      {volunteers.map((v) => (
                        <tr key={v.id} className="hover:bg-[#202020]/30 transition-colors print:hover:bg-transparent">
                           <td className="py-4 px-5 font-bold text-white print:text-black whitespace-nowrap">
                             <div className="flex items-center gap-3">
                               {/* Avatar */}
                               {v.fotoUrl ? (
                                 <img
                                   src={v.fotoUrl}
                                   alt={v.nome}
                                   className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a] flex-shrink-0 print:hidden"
                                   onError={(e) => {
                                     (e.target as HTMLElement).style.display = 'none';
                                   }}
                                 />
                               ) : (
                                 <div className="w-8 h-8 rounded-full bg-[#2a2a2a] text-[#ff5500] font-bold text-xs flex items-center justify-center border border-[#3a3a3a] flex-shrink-0 print:hidden">
                                   {v.nome.charAt(0).toUpperCase()}
                                 </div>
                               )}
                               <div>
                                 <span className="block font-bold text-white print:text-black">{v.nome}</span>
                                 {v.instagram && (
                                   <a 
                                     href={`https://instagram.com/${v.instagram.replace('@', '')}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="text-[10px] text-[#ff5500] hover:underline flex items-center gap-0.5 mt-0.5 print:hidden"
                                   >
                                     @{v.instagram.replace('@', '')}
                                   </a>
                                 )}
                               </div>
                             </div>
                           </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <a
                              href={formatWhatsAppLink(v.telefone, v.nome)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-300 hover:text-[#ff5500] hover:underline print:text-black flex items-center gap-1.5 font-medium"
                            >
                              <svg className="w-3.5 h-3.5 fill-green-400 print:hidden" viewBox="0 0 24 24">
                                <path d="M12.012 1.985c-5.503 0-9.978 4.475-9.978 9.978 0 1.764.462 3.491 1.336 5.02L2.012 22l5.143-1.348a9.92 9.92 0 0 0 4.857 1.258c5.503 0 9.978-4.475 9.978-9.978 0-2.66-1.036-5.161-2.918-7.042A9.919 9.919 0 0 0 12.012 1.985m5.922 13.914c-.244.686-1.22 1.25-1.677 1.299-.44.048-.89.068-2.833-.695-2.483-.974-4.086-3.5-4.208-3.663-.122-.163-1.025-1.365-1.025-2.602 0-1.237.65-1.848.878-2.093.228-.245.508-.306.678-.306.17 0 .34.008.489.015.155.007.363-.057.568.441.209.508.718 1.748.78 1.872.062.124.103.27.02.439-.082.169-.124.275-.245.415-.122.14-.257.311-.367.418-.12.116-.245.244-.105.485.14.24.621 1.022 1.333 1.656.918.818 1.69 1.07 1.93 1.19.24.12.381.102.524-.06.142-.163.61-.71.773-.951.163-.24.326-.2.548-.12.222.08 1.407.663 1.652.785.244.12.408.18.468.283.061.103.061.597-.184 1.283"/>
                              </svg>
                              {v.telefone}
                            </a>
                          </td>
                          <td className="py-4 px-5 text-gray-300 print:text-black">
                            {v.igreja || "—"}
                          </td>
                          <td className="py-4 px-5 text-gray-300 print:text-black font-mono">
                            {v.numeroLegendario || "—"}
                          </td>
                          <td className="py-4 px-5 text-gray-400 print:text-black max-w-xs truncate italic">
                            {v.anotacoes || "Sem observações"}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap print:hidden">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                 href={`/servos/${v.id}`}
                                 className="border border-[#2a2a2a] hover:border-[#ff5500]/50 hover:bg-[#ff5500]/10 text-gray-300 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
                               >
                                 Mais Informações
                               </Link>
                              <button
                                onClick={() => handleLiberar(v.id)}
                                className="border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Liberar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl text-center">
            <span className="material-symbols-outlined text-4xl text-[#ff5500] mb-2 animate-bounce">sync_alt</span>
            <p className="text-sm font-semibold text-white">Por favor, selecione um setor ativo no menu superior para iniciar.</p>
          </div>
        )}
      </main>
    </div>
  );
}
