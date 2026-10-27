import { getSupabaseClient } from '../lib/supabase';
import {
  CompanyProfile,
  Client,
  ClientVehicle,
  ServiceItem,
  ServiceLaunch,
  GoalsConfig,
} from '../types';
import {
  AppState,
  normalizeServiceCategory,
  resolveLaunchItemCategory,
  DEMO_CLIENT_CNPJS,
  formatPlate,
  normalizePlate,
} from '../utils/storage';

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

    // 1. Empresa (tudo maiúsculo exceto e-mail)
    if (companyRes.data) {
      const c = companyRes.data;
      const rawBank = c.dados_bancarios || {
        banco: '',
        agencia: '',
        conta: '',
        tipoConta: 'CONTA CORRENTE',
        chavePix: '',
        tipoChavePix: 'CNPJ',
      };
      state.company = {
        cnpj: (c.cnpj || '').toUpperCase(),
        razaoSocial: (c.razao_social || '').toUpperCase(),
        nomeFantasia: (c.nome_fantasia || '').toUpperCase(),
        email: (c.email || '').toLowerCase().trim(),
        telefone: (c.telefone || '').toUpperCase(),
        endereco: (c.endereco || '').toUpperCase(),
        dadosBancarios: {
          ...rawBank,
          banco: (rawBank.banco || '').toUpperCase(),
          agencia: (rawBank.agencia || '').toUpperCase(),
          conta: (rawBank.conta || '').toUpperCase(),
          tipoConta: (rawBank.tipoConta || 'CONTA CORRENTE').toUpperCase(),
          chavePix:
            rawBank.tipoChavePix === 'Email'
              ? (rawBank.chavePix || '').toLowerCase().trim()
              : (rawBank.chavePix || '').toUpperCase(),
        },
        logoUrl: c.logo_url || '',
        isConfigured: !!c.is_configured,
      };
    }

    // 2. Serviços (tudo maiúsculo com classe normalizada)
    const servicesMap = new Map<string, ServiceItem>();
    if (servicesRes.data && servicesRes.data.length > 0) {
      state.services = servicesRes.data.map((s: any) => {
        const item: ServiceItem = {
          id: s.id,
          codigo: (s.codigo || '').toUpperCase(),
          nome: (s.nome || '').toUpperCase(),
          categoria: normalizeServiceCategory(s.categoria),
          precoPadrao: Number(s.preco_padrao),
          descricao: (s.descricao || '').toUpperCase(),
          ativo: s.ativo !== false,
        };
        servicesMap.set(item.id, item);
        return item;
      });
    }

    // 3. Lançamentos (processados antes dos clientes para vincular veículos lançados automaticamente)
    if (launchesRes.data) {
      state.launches = launchesRes.data.map((l: any) => {
        const contratoCC = (
          l.contrato_centro_custo ||
          (Array.isArray(l.servicos) && l.servicos[0]?._contratoCentroCusto) ||
          ''
        ).toUpperCase();

        return {
          id: l.id,
          numeroOS: (l.numero_os || '').toUpperCase(),
          dataHora: l.data_hora,
          clienteId: l.cliente_id || '',
          clienteNome: (l.cliente_nome || '').toUpperCase(),
          clienteCnpj: (l.cliente_cnpj || '').toUpperCase(),
          placa: formatPlate(l.placa || '').toUpperCase(),
          modelo: (l.modelo || '').toUpperCase(),
          km: l.km !== undefined && l.km !== null ? String(l.km).toUpperCase() : '0',
          responsavel: (l.responsavel || '').toUpperCase(),
          nomeCondutor: (l.nome_condutor || '').toUpperCase(),
          matriculaCondutor: (l.matricula_condutor || '').toUpperCase(),
          contratoCentroCusto: contratoCC,
          servicos: Array.isArray(l.servicos)
            ? l.servicos.map((s: any) => {
                const { _contratoCentroCusto, ...cleanService } = s;
                return {
                  ...cleanService,
                  nome: (cleanService.nome || '').toUpperCase(),
                  categoria: resolveLaunchItemCategory(
                    cleanService,
                    Array.from(servicesMap.values())
                  ),
                };
              })
            : [],
          valorTotal: Number(l.valor_total) || 0,
          assinatura: l.assinatura || '',
          observacoes: (l.observacoes || '').toUpperCase(),
          status: l.status || 'Concluído',
        };
      });
    }

    // 4. Clientes (tudo maiúsculo exceto e-mail, extraindo _veiculos do JSONB tabela_precos + lançamentos)
    if (clientsRes.data && clientsRes.data.length > 0) {
      state.clients = clientsRes.data.map((c: any) => {
        const rawPrecos = c.tabela_precos || {};
        const { _veiculos, _enviarEmail, ...cleanPrecos } = rawPrecos;
        const numericPrecos: Record<string, number> = {};
        Object.keys(cleanPrecos).forEach((k) => {
          if (typeof cleanPrecos[k] === 'number') {
            numericPrecos[k] = cleanPrecos[k];
          }
        });

        const baseVeiculos: ClientVehicle[] = Array.isArray(c.veiculos)
          ? c.veiculos
          : Array.isArray(_veiculos)
          ? _veiculos
          : [];

        // Consolida veículos cadastrados + veículos já lançados em OS para este cliente
        const vehicleMap = new Map<string, ClientVehicle>();
        baseVeiculos.forEach((v) => {
          const norm = normalizePlate(v.placa || '');
          if (norm.length >= 7) {
            vehicleMap.set(norm, {
              placa: formatPlate(v.placa).toUpperCase(),
              modelo: (v.modelo || '').toUpperCase(),
              cadastradoEm: v.cadastradoEm,
            });
          }
        });

        if (state.launches) {
          state.launches.forEach((l) => {
            if (
              l.clienteId === c.id ||
              (l.clienteNome &&
                l.clienteNome.toUpperCase() === (c.nome_fantasia || '').toUpperCase())
            ) {
              const norm = normalizePlate(l.placa || '');
              if (norm.length >= 7 && !vehicleMap.has(norm)) {
                vehicleMap.set(norm, {
                  placa: formatPlate(l.placa).toUpperCase(),
                  modelo: (l.modelo || '').toUpperCase(),
                  cadastradoEm: l.dataHora ? l.dataHora.slice(0, 10) : undefined,
                });
              }
            }
          });
        }

        return {
          id: c.id,
          cnpj: (c.cnpj || '').toUpperCase(),
          razaoSocial: (c.razao_social || '').toUpperCase(),
          nomeFantasia: (c.nome_fantasia || '').toUpperCase(),
          email: (c.email || '').toLowerCase().trim(),
          enviarEmail: _enviarEmail !== undefined ? Boolean(_enviarEmail) : c.enviar_email !== undefined ? Boolean(c.enviar_email) : true,
          telefone: (c.telefone || '').toUpperCase(),
          endereco: (c.endereco || '').toUpperCase(),
          tabelaPrecos: numericPrecos,
          veiculos: Array.from(vehicleMap.values()),
          ativo: c.ativo !== false,
          criadoEm: c.criado_em,
        };
      });
    }

    // 5. Metas
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
        cnpj: (company.cnpj || '').toUpperCase(),
        razao_social: (company.razaoSocial || '').toUpperCase(),
        nome_fantasia: (company.nomeFantasia || '').toUpperCase(),
        email: (company.email || '').toLowerCase().trim(),
        telefone: (company.telefone || '').toUpperCase(),
        endereco: (company.endereco || '').toUpperCase(),
        dados_bancarios: {
          ...company.dadosBancarios,
          banco: (company.dadosBancarios?.banco || '').toUpperCase(),
          agencia: (company.dadosBancarios?.agencia || '').toUpperCase(),
          conta: (company.dadosBancarios?.conta || '').toUpperCase(),
          tipoConta: (company.dadosBancarios?.tipoConta || '').toUpperCase(),
          chavePix:
            company.dadosBancarios?.tipoChavePix === 'Email'
              ? (company.dadosBancarios?.chavePix || '').toLowerCase().trim()
              : (company.dadosBancarios?.chavePix || '').toUpperCase(),
        },
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
        codigo: (service.codigo || '').toUpperCase(),
        nome: (service.nome || '').toUpperCase(),
        categoria: normalizeServiceCategory(service.categoria),
        preco_padrao: service.precoPadrao,
        descricao: service.descricao ? service.descricao.toUpperCase() : '',
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

// Sincronização de Clientes (armazena _veiculos dentro do JSONB tabela_precos para total compatibilidade com o schema Supabase)
export async function syncClientToSupabase(client: Client): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  if (DEMO_CLIENT_CNPJS.includes(client.cnpj)) return false;

  try {
    const payloadPrecos: Record<string, any> = {
      ...(client.tabelaPrecos || {}),
      _enviarEmail: client.enviarEmail !== false,
      _veiculos: (client.veiculos || []).map((v) => ({
        placa: formatPlate(v.placa || '').toUpperCase(),
        modelo: (v.modelo || '').toUpperCase(),
        cadastradoEm: v.cadastradoEm || new Date().toISOString(),
      })),
    };

    const payload: Record<string, any> = {
      id: client.id,
      cnpj: (client.cnpj || 'NÃO INFORMADO').toUpperCase(),
      razao_social: (client.razaoSocial || client.nomeFantasia || '').toUpperCase(),
      nome_fantasia: (client.nomeFantasia || client.razaoSocial || '').toUpperCase(),
      email: (client.email || '').toLowerCase().trim(),
      telefone: (client.telefone || '').toUpperCase(),
      endereco: (client.endereco || '').toUpperCase(),
      tabela_precos: payloadPrecos,
      ativo: client.ativo !== false,
      criado_em: client.criadoEm || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('clients').upsert(payload, { onConflict: 'id' });
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const { criado_em, updated_at, ...minimalPayload } = payload;
      const retry = await supabase.from('clients').upsert(minimalPayload, { onConflict: 'id' });
      error = retry.error;
    }
    if (error) {
      console.error('Erro ao sincronizar cliente no Supabase:', error);
    }
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
    const contratoVal = (launch.contratoCentroCusto || '').trim().toUpperCase();

    // Salva _contratoCentroCusto no JSONB servicos para garantir que nunca seja perdido mesmo sem a coluna na tabela
    const servicosPayload = (launch.servicos || []).map((s, idx) => ({
      ...s,
      nome: (s.nome || '').toUpperCase(),
      categoria: normalizeServiceCategory(s.categoria),
      ...(idx === 0 && contratoVal ? { _contratoCentroCusto: contratoVal } : {}),
    }));

    const payload: Record<string, any> = {
      id: launch.id,
      numero_os: (launch.numeroOS || '').toUpperCase(),
      data_hora: launch.dataHora,
      cliente_id: launch.clienteId || null,
      cliente_nome: (launch.clienteNome || '').toUpperCase(),
      cliente_cnpj: (launch.clienteCnpj || '').toUpperCase(),
      placa: formatPlate(launch.placa || '').toUpperCase(),
      modelo: (launch.modelo || '').toUpperCase(),
      km: String(launch.km !== undefined && launch.km !== null ? launch.km : '0').toUpperCase(),
      responsavel: (launch.responsavel || '').toUpperCase(),
      nome_condutor: (launch.nomeCondutor || '').toUpperCase(),
      matricula_condutor: (launch.matriculaCondutor || '').toUpperCase(),
      servicos: servicosPayload,
      valor_total: Number(launch.valorTotal) || 0,
      assinatura: launch.assinatura || '',
      observacoes: (launch.observacoes || '').toUpperCase(),
      status: launch.status || 'Concluído',
      updated_at: new Date().toISOString(),
    };

    // Tenta primeiro com a coluna contrato_centro_custo caso exista
    const payloadWithCol = {
      ...payload,
      contrato_centro_custo: contratoVal,
    };

    let { error } = await supabase.from('service_launches').upsert(payloadWithCol, { onConflict: 'id' });

    // Fallback 1: se a coluna contrato_centro_custo não existir no banco, salva sem ela (o valor está protegido no JSONB servicos)
    if (error && (error.code === '42703' || error.message?.includes('contrato_centro_custo'))) {
      const retryCol = await supabase.from('service_launches').upsert(payload, { onConflict: 'id' });
      error = retryCol.error;
    }

    // Fallback 2: se houver falha de chave estrangeira (cliente_id não existe na tabela clients), salva com cliente_id nulo para não perder o lançamento
    if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
      const retryFk = await supabase
        .from('service_launches')
        .upsert({ ...payload, cliente_id: null }, { onConflict: 'id' });
      error = retryFk.error;
    }

    if (error) {
      console.error('Erro ao sincronizar lançamento no Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exceção ao sincronizar lançamento no Supabase:', e);
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

export async function clearAllLaunchesFromSupabase(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('service_launches').delete().neq('id', '');
    if (error) console.error('Erro ao limpar lançamentos no Supabase:', error);
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

    // 4. Clientes (ignora clientes fictícios de demonstração)
    for (const c of state.clients) {
      if (!DEMO_CLIENT_CNPJS.includes(c.cnpj)) {
        await syncClientToSupabase(c);
      }
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
