"use client";

import { useState } from "react";
import { checkGhlStatus } from "@/actions/check-status";
import Image from "next/image";

export default function StatusPage() {
  const [legendarioId, setLegendarioId] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    error?: string;
    success?: boolean;
    data?: { 
      name: string; 
      stageName: string; 
      isPaymentReady: boolean;
      timeline?: { name: string; status: "ok" | "pending" | "rejected" }[];
    };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await checkGhlStatus(legendarioId, fullPhone);
    setResult(res);
    setLoading(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    // Format as (XX) XXXXX-XXXX
    let formatted = value;
    if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 7) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }
    setFullPhone(formatted);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-800 rounded-2xl shadow-xl overflow-hidden border border-neutral-700">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold !text-white mb-2">Consulta de Status</h1>
            <p className="!text-neutral-300 text-sm">
              Verifique a situação da sua inscrição para Servos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="legendarioId" className="block text-sm font-medium !text-neutral-200 mb-1">
                Número do Legendário
              </label>
              <input
                id="legendarioId"
                type="text"
                required
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none !text-white placeholder-neutral-500"
                placeholder="Ex: 1234"
                value={legendarioId}
                onChange={(e) => setLegendarioId(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="fullPhone" className="block text-sm font-medium !text-neutral-200 mb-1">
                Número de Telefone
              </label>
              <input
                id="fullPhone"
                type="text"
                required
                maxLength={15}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none !text-white placeholder-neutral-500"
                placeholder="(99) 99999-9999"
                value={fullPhone}
                onChange={handlePhoneChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Consultando..." : "Consultar Status"}
            </button>
          </form>

          {result && (
            <div className="mt-8 pt-6 border-t border-neutral-700">
              {result.error ? (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-red-200 text-sm text-center flex flex-col items-center">
                  <p className="mb-4 text-base font-medium">{result.error}</p>
                  <p className="text-neutral-300 text-sm mb-4">
                    Caso não tenha retornado nenhum dado, entre em contato com o suporte.
                  </p>
                  <a
                    href="https://wa.me/5569999999596"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                  >
                    Falar com Suporte no WhatsApp
                  </a>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-700 shadow-inner">
                    <p className="text-sm text-neutral-400 mb-1">Olá, {result.data?.name}</p>
                    <p className="text-lg font-medium text-white mb-4">
                      Sua etapa atual é:
                    </p>
                    <div className="inline-block bg-orange-500/20 text-orange-400 font-semibold px-4 py-2 rounded-full border border-orange-500/30 mb-6">
                      {result.data?.stageName}
                    </div>

                    {result.data?.timeline && (
                      <div className="text-left mt-4 border-t border-neutral-800 pt-6">
                        <h3 className="text-neutral-400 text-sm font-semibold mb-4 uppercase tracking-wider">Progresso da Inscrição</h3>
                        <div className="space-y-4">
                          {result.data.timeline.map((step, idx) => (
                            <div key={idx} className="flex items-center">
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3
                                ${step.status === 'ok' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                  step.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                                  'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
                                {step.status === 'ok' && (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {step.status === 'rejected' && (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                                {step.status === 'pending' && (
                                  <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full"></span>
                                )}
                              </div>
                              <span className={`text-sm ${step.status === 'ok' ? 'text-neutral-200' : step.status === 'rejected' ? 'text-red-300' : 'text-neutral-500'}`}>
                                {step.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
