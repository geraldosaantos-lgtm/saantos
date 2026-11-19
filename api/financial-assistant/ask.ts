import {
  askFinancialAssistant,
  AssistantServiceError,
} from '../../server/financialAssistantAI.ts';

export default async function handler(
  req: { method?: string; body?: Record<string, unknown> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const result = await askFinancialAssistant(req.body || {});
    res.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof AssistantServiceError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Erro interno ao processar pergunta.';
    res.status(500).json({ error: message });
  }
}
