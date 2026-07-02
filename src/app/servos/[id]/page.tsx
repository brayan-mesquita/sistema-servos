"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getVolunteerById, updateVolunteerNotes } from "@/app/actions";

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
  setorId: string | null;
  setor?: {
    id: string;
    name: string;
  } | null;
  instagram: string | null;
  fotoUrl: string | null;
}

export default function ServantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Notes editing states
  const [notes, setNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      loadVolunteer();
    }
  }, [id]);

  async function loadVolunteer() {
    setLoading(true);
    setError(null);
    try {
      const res = await getVolunteerById(id);
      if (res.success && res.data) {
        setVolunteer(res.data as Volunteer);
        setNotes(res.data.anotacoes || "");
      } else {
        setError(res.error || "Servo não encontrado.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar dados do servo.");
    } finally {
      setLoading(false);
    }
  }

  const handleSaveNotes = async () => {
    if (!volunteer) return;
    setNotesLoading(true);
    setNotesSuccess(false);

    try {
      const res = await updateVolunteerNotes(volunteer.id, notes);
      if (res.success) {
        setNotesSuccess(true);
        setTimeout(() => setNotesSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotesLoading(false);
    }
  };

  const formatWhatsAppLink = (phone: string, name: string) => {
    const text = encodeURIComponent(`Olá ${name}, aqui é o coordenador do setor ${volunteer?.setor?.name || ""} dos Legendários!`);
    const cleaned = phone.replace(/\D/g, "");
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${text}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined animate-spin text-[#ff5500] text-4xl">sync</span>
            <p className="text-sm text-gray-400">Carregando detalhes do servo...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !volunteer) {
    return (
      <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-8 rounded-2xl max-w-md text-center space-y-4 shadow-xl">
            <span className="material-symbols-outlined text-red-500 text-5xl">warning</span>
            <h3 className="font-display font-bold text-xl text-white">Ops, algo deu errado!</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{error || "Não foi possível carregar as informações do voluntário."}</p>
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs font-bold rounded-xl transition-all block w-full uppercase"
            >
              Voltar
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans pb-16">
      <Header />

      <main className="pt-8 px-4 md:px-8 max-w-4xl mx-auto space-y-6">
        {/* Back and Breadcrumbs Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Voltar
          </button>

          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            ID: {volunteer.id}
          </span>
        </div>

        {/* Profile Card Header */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          {/* Silhouette Avatar / Real Photo */}
          {volunteer.fotoUrl ? (
            <img
              src={volunteer.fotoUrl}
              alt={volunteer.nome}
              className="w-24 h-24 rounded-2xl object-cover border border-[#3a3a3a] flex-shrink-0 shadow-inner"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-24 h-24 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-6xl">person</span>
            </div>
          )}

          <div className="flex-grow text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2.5">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {volunteer.nome}
              </h2>
              <div className="flex justify-center md:justify-start gap-2">
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 bg-[#ff5500]/15 text-[#ff5500] rounded-full tracking-tighter">
                  1ª Opção: {volunteer.opcao1 || "Sem opção"}
                </span>
                {volunteer.opcao2 && (
                  <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 bg-gray-800 text-gray-400 rounded-full tracking-tighter">
                    2ª Opção: {volunteer.opcao2}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#e0e0e0] font-semibold">
              Igreja: <span className="text-white">{volunteer.igreja || "Não informada"}</span>
            </p>

            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1.5 text-xs text-gray-400 mt-2 font-medium">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-[#ff5500]">military_tech</span>
                Status: <span className={volunteer.status === "Recruited" ? "text-green-400 font-bold" : "text-amber-400 font-bold"}>
                  {volunteer.status === "Recruited" ? `Escalado no Setor ${volunteer.setor?.name || ""}` : "Disponível"}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                Nascimento: {volunteer.dataNascimento || "N/D"} ({volunteer.idade ? `${volunteer.idade} anos` : "N/D"})
              </span>
            </div>
          </div>

          {/* Decorative orange background aura */}
          <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-[#ff5500]/5 rounded-full blur-[80px] pointer-events-none"></div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Info Columns */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Cards section */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2 border-b border-[#2a2a2a] pb-3">
                <span className="material-symbols-outlined text-lg text-[#ff5500]">info</span>
                Ficha do Voluntário
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Número do Legendário</span>
                  <span className="font-mono text-white font-semibold mt-1 block">{volunteer.numeroLegendario || "Não informado"}</span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Tops Servidos</span>
                  <span className="text-white font-semibold mt-1 block">serviu {volunteer.quantidadeServicos} {volunteer.quantidadeServicos === 1 ? "Top" : "Tops"}</span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Áreas em que já serviu</span>
                  <p className="text-white font-semibold mt-1 leading-relaxed">{volunteer.areasServidas || "Nenhuma área informada"}</p>
                </div>

                {volunteer.email && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Endereço de E-mail</span>
                    <span className="text-white font-semibold mt-1 block break-all">{volunteer.email}</span>
                  </div>
                )}

                {volunteer.instagram && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Instagram</span>
                    <a
                      href={`https://instagram.com/${volunteer.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#ff5500] hover:underline font-semibold mt-1 block"
                    >
                      @{volunteer.instagram.replace('@', '')}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Annotations Panel */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-3">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-[#ff5500]">notes</span>
                  Observações e Anotações Internas
                </h3>
                {notesSuccess && (
                  <span className="text-[11px] text-green-400 flex items-center gap-1 animate-pulse">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    Salvo
                  </span>
                )}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Insira observações relevantes sobre o voluntário (restrições médicas, habilidades específicas, preferências de escala...)"
                rows={4}
                className="w-full bg-[#131313] border border-[#2a2a2a] rounded-xl p-3.5 text-xs text-white placeholder-gray-600 focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] transition-all outline-none resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={notesLoading}
                  className="bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {notesLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Salvar Anotações</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Contact Details Sidebar */}
          <div className="space-y-6">
            
            {/* Contact Panel */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <h3 className="font-display text-base font-bold text-white border-b border-[#2a2a2a] pb-3">
                Canais de Contato
              </h3>

              {/* Servant's phone card */}
              <div className="bg-[#131313] border border-[#2a2a2a] p-4 rounded-xl space-y-3.5">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Telefone do Servo</p>
                  <p className="text-sm font-bold text-white mt-1">{volunteer.telefone}</p>
                </div>

                <a
                  href={formatWhatsAppLink(volunteer.telefone, volunteer.nome)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600/10 hover:bg-green-600 border border-green-500/20 hover:border-green-500 text-green-400 hover:text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.012 1.985c-5.503 0-9.978 4.475-9.978 9.978 0 1.764.462 3.491 1.336 5.02L2.012 22l5.143-1.348a9.92 9.92 0 0 0 4.857 1.258c5.503 0 9.978-4.475 9.978-9.978 0-2.66-1.036-5.161-2.918-7.042A9.919 9.919 0 0 0 12.012 1.985m5.922 13.914c-.244.686-1.22 1.25-1.677 1.299-.44.048-.89.068-2.833-.695-2.483-.974-4.086-3.5-4.208-3.663-.122-.163-1.025-1.365-1.025-2.602 0-1.237.65-1.848.878-2.093.228-.245.508-.306.678-.306.17 0 .34.008.489.015.155.007.363-.057.568.441.209.508.718 1.748.78 1.872.062.124.103.27.02.439-.082.169-.124.275-.245.415-.122.14-.257.311-.367.418-.12.116-.245.244-.105.485.14.24.621 1.022 1.333 1.656.918.818 1.69 1.07 1.93 1.19.24.12.381.102.524-.06.142-.163.61-.71.773-.951.163-.24.326-.2.548-.12.222.08 1.407.663 1.652.785.244.12.408.18.468.283.061.103.061.597-.184 1.283"/>
                  </svg>
                  <span>Abrir WhatsApp</span>
                </a>
              </div>

              {/* Pastor reference card */}
              <div className="bg-[#131313] border border-[#2a2a2a] p-4 rounded-xl space-y-3.5">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pastor / Líder de Referência</p>
                  <p className="text-sm font-bold text-white mt-1">{volunteer.nomePastor || "Não cadastrado"}</p>
                </div>

                {volunteer.telefonePastor ? (
                  <>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Telefone do Pastor</p>
                      <p className="text-sm font-semibold text-white mt-1">{volunteer.telefonePastor}</p>
                    </div>

                    <a
                      href={formatWhatsAppLink(volunteer.telefonePastor, volunteer.nomePastor || "Pastor")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-green-600/10 hover:bg-green-600 border border-green-500/20 hover:border-green-500 text-green-400 hover:text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.012 1.985c-5.503 0-9.978 4.475-9.978 9.978 0 1.764.462 3.491 1.336 5.02L2.012 22l5.143-1.348a9.92 9.92 0 0 0 4.857 1.258c5.503 0 9.978-4.475 9.978-9.978 0-2.66-1.036-5.161-2.918-7.042A9.919 9.919 0 0 0 12.012 1.985m5.922 13.914c-.244.686-1.22 1.25-1.677 1.299-.44.048-.89.068-2.833-.695-2.483-.974-4.086-3.5-4.208-3.663-.122-.163-1.025-1.365-1.025-2.602 0-1.237.65-1.848.878-2.093.228-.245.508-.306.678-.306.17 0 .34.008.489.015.155.007.363-.057.568.441.209.508.718 1.748.78 1.872.062.124.103.27.02.439-.082.169-.124.275-.245.415-.122.14-.257.311-.367.418-.12.116-.245.244-.105.485.14.24.621 1.022 1.333 1.656.918.818 1.69 1.07 1.93 1.19.24.12.381.102.524-.06.142-.163.61-.71.773-.951.163-.24.326-.2.548-.12.222.08 1.407.663 1.652.785.244.12.408.18.468.283.061.103.061.597-.184 1.283"/>
                      </svg>
                      <span>Abrir WhatsApp</span>
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 italic">Nenhum telefone de pastor cadastrado</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
