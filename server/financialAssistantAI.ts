import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface AssistantChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AskFinancialAssistantInput {
  question?: string;
  history?: AssistantChatTurn[];
  context?: Record<string, unknown>;
}

export interface AskFinancialAssistantResult {
  answer: string;
}

export class AssistantServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AssistantServiceError(
      'Chave GEMINI_API_KEY não configurada no servidor. Configure a variável GEMINI_API_KEY nas configurações de ambiente/Secrets para habilitar respostas com IA.',
      500
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function askFinancialAssistant(
  payload: AskFinancialAssistantInput
): Promise<AskFinancialAssistantResult> {
  const question = typeof payload?.question === 'string' ? payload.question.trim() : '';
  if (!question) {
    throw new AssistantServiceError('Digite uma pergunta para o assistente financeiro.', 400);
  }
  if (question.length > 2000) {
    throw new AssistantServiceError('A pergunta deve ter no máximo 2.000 caracteres.', 400);
  }

  const ai = getGenAIClient();
  const contextJson = JSON.stringify(payload.context || {}, null, 2);
  const recentHistory = Array.isArray(payload.history)
    ? payload.history
        .filter(
          (item): item is AssistantChatTurn =>
            Boolean(item) &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.text === 'string' &&
            item.text.trim().length > 0
        )
        .slice(-8)
    : [];

  const historyText =
    recentHistory.length > 0
      ? recentHistory
          .map((turn) => `${turn.role === 'user' ? 'Usuário' : 'Assistente'}: ${turn.text.trim()}`)
          .join('\n')
      : 'Sem histórico anterior.';

  const systemInstruction = `Você é um Assistente Financeiro Especialista (CFO e Controller) para operações de lava jato, estética automotiva e gestão de frotas.
Responda em Português do Brasil de forma objetiva, didática, confiável e prática.

REGRAS OBRIGATÓRIAS:
1. Baseie suas análises EXCLUSIVAMENTE nos dados financeiros reais fornecidos no CONTEXTO JSON abaixo (nunca invente valores ou lançamentos que não existam).
2. Cite os valores reais em R$ (formato brasileiro, ex.: R$ 1.250,00) e percentuais exatos do período analisado sempre que responder sobre números da empresa.
3. Transferências entre contas bancárias já foram isoladas das receitas e despesas para não distorcer Margem de Contribuição, Ponto de Equilíbrio e EBITDA — se o usuário perguntar sobre transferências, esclareça isso.
4. Se o usuário fizer simulações ("e se eu cortar X?", "quanto preciso faturar para lucrar Y?"), mostre a conta passo a passo usando a Margem de Contribuição % e os Custos Fixos do contexto.
5. Se não houver movimentações lançadas no período (valores zerados), oriente claramente o que lançar ou importar (extrato bancário, receitas e despesas no Plano de Contas).
6. Estruture a resposta com parágrafos curtos e marcadores simples (- ou 1.) quando listar ações práticas. Mantenha a resposta direta e fácil de ler (entre 100 e 280 palavras, salvo quando o usuário pedir detalhamento completo).`;

  const userPrompt = `CONTEXTO FINANCEIRO ATUAL DA EMPRESA:
${contextJson}

HISTÓRICO RECENTE DA CONVERSA:
${historyText}

PERGUNTA DO USUÁRIO:
${question}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const answer = (response.text ?? '').trim();
    if (!answer) {
      throw new AssistantServiceError(
        'O assistente não retornou texto para esta pergunta. Tente reformular sua dúvida.',
        502
      );
    }
    return { answer };
  } catch (err: unknown) {
    if (err instanceof AssistantServiceError) {
      throw err;
    }
    const rawMsg = err instanceof Error ? err.message : String(err || 'Erro desconhecido');
    const upper = rawMsg.toUpperCase();

    if (upper.includes('API_KEY_INVALID') || upper.includes('PERMISSION_DENIED') || upper.includes('403')) {
      throw new AssistantServiceError(
        'Chave da API Gemini inválida ou sem permissão. Verifique a chave GEMINI_API_KEY nas configurações de Secrets/ambiente.',
        403
      );
    }
    if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429')) {
      throw new AssistantServiceError(
        'Limite de requisições da API Gemini atingido temporariamente. Aguarde alguns instantes e tente novamente.',
        429
      );
    }
    if (upper.includes('NOT_FOUND') || upper.includes('404')) {
      throw new AssistantServiceError(
        'Modelo de IA indisponível no momento. Verifique a configuração do endpoint no servidor.',
        404
      );
    }

    throw new AssistantServiceError(
      `Falha ao consultar o assistente financeiro: ${rawMsg}`,
      502
    );
  }
}
