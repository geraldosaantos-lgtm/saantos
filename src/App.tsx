import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  CompanyProfile,
  Client,
  ServiceItem,
  ServiceLaunch,
  GoalsConfig,
} from './types';
import { loadStoredData, saveStoredData } from './utils/storage';
import { getSupabaseConfig } from './lib/supabase';
import {
  fetchStateFromSupabase,
  syncCompanyToSupabase,
  syncServiceToSupabase,
  deleteServiceFromSupabase,
  syncClientToSupabase,
  deleteClientFromSupabase,
  syncLaunchToSupabase,
  deleteLaunchFromSupabase,
  syncGoalsToSupabase,
} from './services/supabaseService';
import { DashboardHome } from './components/DashboardHome';
import { LancamentosView } from './components/LancamentosView';
import { LancamentoModal } from './components/LancamentoModal';
import { ClientesView } from './components/ClientesView';
import { ServicosView } from './components/ServicosView';
import { MetasView } from './components/MetasView';
import { RelatoriosView } from './components/RelatoriosView';
import { CompanyModal } from './components/CompanyModal';
import { InfraModal } from './components/InfraModal';
import {
  Car,
  Users,
  Wrench,
  Target,
  FileText,
  Building2,
  Plus,
  Home,
  Menu,
  X,
  AlertCircle,
  Database,
  MoreHorizontal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [data, setData] = useState(() => loadStoredData());
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [isInfraModalOpen, setIsInfraModalOpen] = useState(false);
  const [editingLaunch, setEditingLaunch] = useState<ServiceLaunch | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState(false);

  // Inicialização: carrega dados do Supabase se estiver configurado
  useEffect(() => {
    const cfg = getSupabaseConfig();
    const hasConfig = !!cfg.url && !!cfg.anonKey;
    setIsSupabaseOnline(hasConfig);

    if (hasConfig) {
      fetchStateFromSupabase().then((remoteData) => {
        if (remoteData) {
          setData((prev) => {
            const merged = {
              company: remoteData.company || prev.company,
              services: remoteData.services?.length ? remoteData.services : prev.services,
              clients: remoteData.clients?.length ? remoteData.clients : prev.clients,
              launches: remoteData.launches?.length ? remoteData.launches : prev.launches,
              goals: remoteData.goals || prev.goals,
            };
            saveStoredData(merged);
            return merged;
          });
        }
      });
    }
  }, [isInfraModalOpen]);

  // Primeiro acesso: verifica se a empresa já foi configurada
  useEffect(() => {
    if (!data.company.isConfigured) {
      setIsFirstAccess(true);
      setIsCompanyModalOpen(true);
    }
  }, [data.company.isConfigured]);

  // Salva no localStorage sempre que houver alteração
  const updateData = (updater: (prev: typeof data) => typeof data) => {
    setData((prev) => {
      const next = updater(prev);
      saveStoredData(next);
      return next;
    });
  };

  // Handlers para Minha Empresa
  const handleSaveCompany = (updatedCompany: CompanyProfile) => {
    updateData((prev) => ({
      ...prev,
      company: updatedCompany,
    }));
    syncCompanyToSupabase(updatedCompany);
    setIsFirstAccess(false);
  };

  // Handlers para Lançamentos
  const handleSaveLaunch = (launch: ServiceLaunch) => {
    updateData((prev) => {
      const index = prev.launches.findIndex((l) => l.id === launch.id);
      let updatedLaunches = [...prev.launches];
      if (index >= 0) {
        updatedLaunches[index] = launch;
      } else {
        updatedLaunches = [launch, ...updatedLaunches];
      }
      return {
        ...prev,
        launches: updatedLaunches,
      };
    });
    syncLaunchToSupabase(launch);
    setEditingLaunch(null);
  };

  const handleDeleteLaunch = (id: string) => {
    updateData((prev) => ({
      ...prev,
      launches: prev.launches.filter((l) => l.id !== id),
    }));
    deleteLaunchFromSupabase(id);
  };

  const handleEditLaunch = (launch: ServiceLaunch) => {
    setEditingLaunch(launch);
    setIsLancamentoModalOpen(true);
  };

  // Handlers para Clientes
  const handleSaveClient = (client: Client) => {
    updateData((prev) => {
      const index = prev.clients.findIndex((c) => c.id === client.id);
      let updatedClients = [...prev.clients];
      if (index >= 0) {
        updatedClients[index] = client;
      } else {
        updatedClients = [...updatedClients, client];
      }
      return {
        ...prev,
        clients: updatedClients,
      };
    });
    syncClientToSupabase(client);
  };

  const handleDeleteClient = (id: string) => {
    updateData((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== id),
    }));
    deleteClientFromSupabase(id);
  };

  // Handlers para Serviços
  const handleSaveService = (service: ServiceItem) => {
    updateData((prev) => {
      const index = prev.services.findIndex((s) => s.id === service.id);
      let updatedServices = [...prev.services];
      if (index >= 0) {
        updatedServices[index] = service;
      } else {
        updatedServices = [...updatedServices, service];
      }
      return {
        ...prev,
        services: updatedServices,
      };
    });
    syncServiceToSupabase(service);
  };

  const handleDeleteService = (id: string) => {
    updateData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
    deleteServiceFromSupabase(id);
  };

  // Handlers para Metas
  const handleSaveGoals = (updatedGoals: GoalsConfig) => {
    updateData((prev) => ({
      ...prev,
      goals: updatedGoals,
    }));
    syncGoalsToSupabase(updatedGoals);
  };

  const navItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'lancamentos', label: 'Lançamentos', icon: Car },
    { id: 'clientes', label: 'Clientes & Preços', icon: Users },
    { id: 'servicos', label: 'Serviços', icon: Wrench },
    { id: 'metas', label: 'Metas', icon: Target },
    { id: 'relatorios', label: 'Relatórios (PDF/Excel)', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (Nav links) — Zone 3 (Actions) */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Zone 1: Brand title wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('inicio')}
              className="text-left flex items-center gap-2 group focus:outline-none"
            >
              <div className="p-1.5 bg-neutral-900 text-white rounded-lg group-hover:bg-neutral-800 transition-colors">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-neutral-950 tracking-tight block leading-tight">
                  AutoLava
                </span>
                <span className="text-[10px] text-neutral-500 font-medium block leading-none">
                  Serviços Automotivos
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-950 font-bold'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsInfraModalOpen(true)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap border ${
                isSupabaseOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              }`}
              title="Configuração de Infraestrutura (GitHub, Vercel, Supabase)"
            >
              <Database className={`w-3.5 h-3.5 ${isSupabaseOnline ? 'text-emerald-600' : 'text-neutral-500'}`} />
              <span className="hidden sm:inline">
                {isSupabaseOnline ? 'Supabase Conectado' : 'Infra / Supabase'}
              </span>
            </button>

            <button
              onClick={() => {
                setIsFirstAccess(false);
                setIsCompanyModalOpen(true);
              }}
              className="px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Dados da Minha Empresa (CNPJ, Razão, PIX, Banco, Logotipo)"
            >
              <Building2 className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Minha Empresa</span>
            </button>

            <button
              onClick={() => {
                setEditingLaunch(null);
                setIsLancamentoModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lançamento</span>
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 py-1">
              Menu de Navegação
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-xs font-medium rounded-lg flex items-center gap-2.5 text-left ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-950 font-bold'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-neutral-500" />
                  {item.label}
                </button>
              );
            })}

            <div className="border-t border-neutral-100 my-2 pt-2 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsCompanyModalOpen(true);
                }}
                className="w-full px-3 py-2.5 text-xs font-medium rounded-lg flex items-center gap-2.5 text-neutral-700 hover:bg-neutral-50"
              >
                <Building2 className="w-4 h-4 text-neutral-500" />
                Dados da Minha Empresa (CNPJ / PIX)
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsInfraModalOpen(true);
                }}
                className="w-full px-3 py-2.5 text-xs font-medium rounded-lg flex items-center gap-2.5 text-neutral-700 hover:bg-neutral-50"
              >
                <Database className={`w-4 h-4 ${isSupabaseOnline ? 'text-emerald-600' : 'text-neutral-500'}`} />
                {isSupabaseOnline ? 'Supabase Conectado (Infra)' : 'Configurar Supabase'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Alerta de Primeiro Acesso se a empresa ainda não tiver sido preenchida */}
      {!data.company.isConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Atenção:</strong> Por favor, confirme os dados cadastrais da sua empresa (CNPJ, Razão Social, PIX e Logotipo) para compor os relatórios.
            </span>
          </div>
          <button
            onClick={() => {
              setIsFirstAccess(true);
              setIsCompanyModalOpen(true);
            }}
            className="font-bold underline ml-2 text-amber-950 hover:text-amber-800"
          >
            Configurar Agora
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
        {activeTab === 'inicio' && (
          <DashboardHome
            company={data.company}
            goals={data.goals}
            launches={data.launches}
            onOpenLancamento={() => {
              setEditingLaunch(null);
              setIsLancamentoModalOpen(true);
            }}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenCompanyModal={() => {
              setIsFirstAccess(false);
              setIsCompanyModalOpen(true);
            }}
          />
        )}

        {activeTab === 'lancamentos' && (
          <LancamentosView
            launches={data.launches}
            onOpenNewLaunch={() => {
              setEditingLaunch(null);
              setIsLancamentoModalOpen(true);
            }}
            onEditLaunch={handleEditLaunch}
            onDeleteLaunch={handleDeleteLaunch}
          />
        )}

        {activeTab === 'clientes' && (
          <ClientesView
            clients={data.clients}
            services={data.services}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
          />
        )}

        {activeTab === 'servicos' && (
          <ServicosView
            services={data.services}
            onSaveService={handleSaveService}
            onDeleteService={handleDeleteService}
          />
        )}

        {activeTab === 'metas' && (
          <MetasView
            goals={data.goals}
            launches={data.launches}
            onSaveGoals={handleSaveGoals}
          />
        )}

        {activeTab === 'relatorios' && (
          <RelatoriosView
            company={data.company}
            clients={data.clients}
            launches={data.launches}
            onOpenCompanyModal={() => {
              setIsFirstAccess(false);
              setIsCompanyModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Modal: Lançamento de Serviço */}
      <LancamentoModal
        isOpen={isLancamentoModalOpen}
        onClose={() => {
          setIsLancamentoModalOpen(false);
          setEditingLaunch(null);
        }}
        clients={data.clients}
        services={data.services}
        onSave={handleSaveLaunch}
        existingLaunch={editingLaunch}
      />

      {/* Modal: Configuração / Edição de Dados da Minha Empresa */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        company={data.company}
        onSave={handleSaveCompany}
        isFirstAccess={isFirstAccess}
      />

      {/* Modal: Infraestrutura (GitHub + Vercel + Supabase) */}
      <InfraModal
        isOpen={isInfraModalOpen}
        onClose={() => setIsInfraModalOpen(false)}
        currentState={data}
        onStateUpdated={(newState) => {
          setData(newState);
          saveStoredData(newState);
        }}
      />

      {/* Footer discreto */}
      <footer className="mt-auto border-t border-neutral-200 bg-white py-4 px-6 text-center text-xs text-neutral-500 print:hidden hidden md:block">
        <p>
          AutoLava · Sistema de Gestão Operacional de Serviços Automotivos e Frotas
        </p>
      </footer>

      {/* Barra de Navegação Inferior Fixa para Celular (Mobile Navigation Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-3 py-1.5 flex items-center justify-around shadow-lg print:hidden">
        <button
          onClick={() => setActiveTab('inicio')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] transition-colors ${
            activeTab === 'inicio' ? 'text-neutral-950 font-bold' : 'text-neutral-500'
          }`}
        >
          <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'inicio' ? 'text-neutral-950' : 'text-neutral-400'}`} />
          <span>Início</span>
        </button>

        <button
          onClick={() => setActiveTab('lancamentos')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] transition-colors ${
            activeTab === 'lancamentos' ? 'text-neutral-950 font-bold' : 'text-neutral-500'
          }`}
        >
          <Car className={`w-5 h-5 mb-0.5 ${activeTab === 'lancamentos' ? 'text-neutral-950' : 'text-neutral-400'}`} />
          <span>Ordens</span>
        </button>

        {/* Botão de Destaque: Novo Lançamento Rápido no Pátio */}
        <button
          onClick={() => {
            setEditingLaunch(null);
            setIsLancamentoModalOpen(true);
          }}
          className="-mt-5 w-12 h-12 bg-neutral-950 text-white rounded-full shadow-lg flex items-center justify-center border-4 border-white active:scale-95 transition-transform"
          aria-label="Novo Lançamento de Serviço"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] transition-colors ${
            activeTab === 'clientes' ? 'text-neutral-950 font-bold' : 'text-neutral-500'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'clientes' ? 'text-neutral-950' : 'text-neutral-400'}`} />
          <span>Clientes</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] transition-colors ${
            mobileMenuOpen || ['servicos', 'metas', 'relatorios'].includes(activeTab)
              ? 'text-neutral-950 font-bold'
              : 'text-neutral-500'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 mb-0.5 ${mobileMenuOpen || ['servicos', 'metas', 'relatorios'].includes(activeTab) ? 'text-neutral-950' : 'text-neutral-400'}`} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}
