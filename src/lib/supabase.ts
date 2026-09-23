import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_STORAGE_KEY = 'autolava_supabase_credentials';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

export const DEFAULT_SUPABASE_URL = 'https://hklgdfiyersyiesyktqp.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_YsnM2JfCjjdg18wnQZXmbQ_QX73ATaz';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // 1. Variável de ambiente (Vercel ou .env)
  if (envUrl && envKey && !envUrl.includes('seu-projeto')) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
    };
  }

  // 2. Credenciais personalizadas salvas no navegador
  try {
    const custom = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          source: 'custom',
        };
      }
    }
  } catch (e) {
    console.error('Erro ao ler credenciais personalizadas do Supabase:', e);
  }

  // 3. Nuvem oficial do AutoLava (permite sincronização imediata no celular e computador)
  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      source: 'default' as any,
    };
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
  };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(
    SUPABASE_CONFIG_STORAGE_KEY,
    JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
  );
  cachedClient = null; // Invalida cliente em cache para recriar
}

export function removeCustomSupabaseConfig() {
  localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient && lastUrl === config.url && lastKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUrl = config.url;
    lastKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar cliente Supabase:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'URL e Chave Anon do Supabase não configuradas.',
    };
  }

  try {
    // Testa consulta à tabela company_profile ou services
    const { error } = await client.from('company_profile').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message:
            'Conectado ao Supabase, porém as tabelas ainda não foram criadas! Execute o arquivo supabase_schema.sql no SQL Editor do Supabase.',
          details: error,
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message} (${error.code})`,
        details: error,
      };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida e tabelas validadas com sucesso!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na requisição: ${err.message || 'Verifique a URL e a internet.'}`,
      details: err,
    };
  }
}
