import { getSupabaseClient } from '../lib/supabase';
import {
  CompanyProfile,
  Client,
  ServiceItem,
  ServiceLaunch,
  GoalsConfig,
} from '../types';
import { AppState } from '../utils/storage';

// Mapeamentos de / para o banco de dados Supabase

export async function fetchStateFromSupabase(): Promise<Partial<AppState> | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [companyRes, servicesRes, clientsRes, goalsRes, launchesRes] =
      await Promise.all([
        supabase.from('company_profile').select('*').limit(1).maybeSingle(),
        supabase.from('services').select('*').order('codigo', { ascending: true }),
        supabase.from('clients').select('*').order('nome_fantasia', { ascending: true }),
        supabase.from('goals_config').select('*').limit(1).maybeSingle(),
        supabase.from('service_launches').select('*').order('data_hora', { ascending: false }),
      ]);

    // Se houve erro de tabela inexistente, aborta
    if (servicesRes.error || clientsRes.error || launchesRes.error) {
      console.warn('Erro ao consultar tabelas do Supabase:', {
        services: servicesRes.error,
        clients: clientsRes.error,
        launches: launchesRes.error,
      });
      return null;
    }

    const state: Partial<AppState> = {};

    // 1. Empresa
    if (companyRes.data) {
      const c = companyRes.data;
      state.company = {
        cnpj: c.cnpj || '',
        razaoSocial: c.razao_social || '',
        nomeFantasia: c.nome_fantasia || '',
        email: c.email || '',
        telefone: c.telefone || '',
        endereco: c.endereco || '',
        dadosBancarios: c.dados_bancarios || {
          banco: '',
          agencia: '',
          conta: '',
          tipoConta: 'Conta Corrente',
          chavePix: '',
          tipoChavePix: 'CNPJ',
        },
        logoUrl: c.logo_url || '',
        isConfigured: !!c.is_configured,
      };
    }

    // 2. Serviços
    if (servicesRes.data && servicesRes.data.length > 0) {
      state.services = servicesRes.data.map((s: any) => ({
        id: s.id,
        codigo: s.codigo,
        nome: s.nome,
        categoria: s.categoria,
        precoPadrao: Number(s.preco_padrao),
        descricao: s.descricao || '',
        ativo: s.ativo !== false,
      }));
    }

    // 3. Clientes
    if (clientsRes.data && clientsRes.data.length > 0) {
      state.clients = clientsRes.data.map((c: any) => ({
        id: c.id,
        cnpj: c.cnpj,
        razaoSocial: c.razao_social,
        nomeFantasia: c.nome_fantasia,
        email: c.email,
        telefone: c.telefone,
        endereco: c.endereco || '',
        tabelaPrecos: c.tabela_precos || {},
        ativo: c.ativo !== false,
        criadoEm: c.criado_em,
      }));
    }

    // 4. Metas
    if (goalsRes.data) {
      const g = goalsRes.data;
      state.goals = {
        metaDiaria: Number(g.meta_diaria) || 800,
        metaSemanal: Number(g.meta_semanal) || 4800,
        metaMensal: Number(g.meta_mensal) || 22000,
        metaDiariaQtd: Number(g.meta_diaria_qtd) || 12,
        metaSemanalQtd: Number(g.meta_semanal_qtd) || 70,
        metaMensalQtd: Number(g.meta_mensal_qtd) || 300,
      };
    }

    // 5. Lançamentos
    if (launchesRes.data) {
      state.launches = launchesRes.data.map((l: any) => ({
        id: l.id,
        numeroOS: l.numero_os,
        dataHora: l.data_hora,
        clienteId: l.cliente_id || '',
        clienteNome: l.cliente_nome,
        clienteCnpj: l.cliente_cnpj || '',
        placa: l.placa,
        modelo: l.modelo,
        km: l.km,
        responsavel: l.responsavel,
        nomeCondutor: l.nome_condutor,
        matriculaCondutor: l.matricula_condutor,
        servicos: l.servicos || [],
        valorTotal: Number(l.valor_total) || 0,
        assinatura: l.assinatura || '',
        observacoes: l.observacoes || '',
        status: l.status || 'Concluído',
      }));
    }

    return state;
  } catch (err) {
    console.error('Falha ao carregar estado do Supabase:', err);
    return null;
  }
}

// Sincronização de Empresa
export async function syncCompanyToSupabase(company: CompanyProfile): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('company_profile').upsert(
      {
        id: 'default',
        cnpj: company.cnpj,
        razao_social: company.razaoSocial,
        nome_fantasia: company.nomeFantasia,
        email: company.email,
        telefone: company.telefone,
        endereco: company.endereco,
        dados_bancarios: company.dadosBancarios,
        logo_url: company.logoUrl,
        is_configured: company.isConfigured,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) console.error('Erro ao sincronizar empresa no Supabase:', error);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Sincronização de Serviços
export async function syncServiceToSupabase(service: ServiceItem): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('services').upsert(
      {
        id: service.id,
        codigo: service.codigo,
        nome: service.nome,
        categoria: service.categoria,
        preco_padrao: service.precoPadrao,
        descricao: service.descricao,
        ativo: service.ativo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function deleteServiceFromSupabase(serviceId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Sincronização de Clientes
export async function syncClientToSupabase(client: Client): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('clients').upsert(
      {
        id: client.id,
        cnpj: client.cnpj,
        razao_social: client.razaoSocial,
        nome_fantasia: client.nomeFantasia,
        email: client.email,
        telefone: client.telefone,
        endereco: client.endereco,
        tabela_precos: client.tabelaPrecos,
        ativo: client.ativo,
        criado_em: client.criadoEm,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Sincronização de Lançamentos
export async function syncLaunchToSupabase(launch: ServiceLaunch): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('service_launches').upsert(
      {
        id: launch.id,
        numero_os: launch.numeroOS,
        data_hora: launch.dataHora,
        cliente_id: launch.clienteId || null,
        cliente_nome: launch.clienteNome,
        cliente_cnpj: launch.clienteCnpj,
        placa: launch.placa,
        modelo: launch.modelo,
        km: String(launch.km),
        responsavel: launch.responsavel,
        nome_condutor: launch.nomeCondutor,
        matricula_condutor: launch.matriculaCondutor,
        servicos: launch.servicos,
        valor_total: launch.valorTotal,
        assinatura: launch.assinatura,
        observacoes: launch.observacoes || '',
        status: launch.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) console.error('Erro ao sincronizar lançamento no Supabase:', error);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function deleteLaunchFromSupabase(launchId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('service_launches').delete().eq('id', launchId);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Sincronização de Metas
export async function syncGoalsToSupabase(goals: GoalsConfig): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('goals_config').upsert(
      {
        id: 'default',
        meta_diaria: goals.metaDiaria,
        meta_semanal: goals.metaSemanal,
        meta_mensal: goals.metaMensal,
        meta_diaria_qtd: goals.metaDiariaQtd,
        meta_semanal_qtd: goals.metaSemanalQtd,
        meta_mensal_qtd: goals.metaMensalQtd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Exportar todos os dados locais para o Supabase (carga inicial / migração)
export async function uploadAllLocalDataToSupabase(state: AppState): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    // 1. Empresa
    await syncCompanyToSupabase(state.company);

    // 2. Metas
    await syncGoalsToSupabase(state.goals);

    // 3. Serviços
    for (const s of state.services) {
      await syncServiceToSupabase(s);
    }

    // 4. Clientes
    for (const c of state.clients) {
      await syncClientToSupabase(c);
    }

    // 5. Lançamentos
    for (const l of state.launches) {
      await syncLaunchToSupabase(l);
    }

    return {
      success: true,
      message: `Carga concluída! ${state.services.length} serviços, ${state.clients.length} clientes e ${state.launches.length} ordens de serviço enviadas ao Supabase.`,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Erro na exportação para o Supabase: ${e.message}`,
    };
  }
}
