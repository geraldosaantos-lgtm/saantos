import JSZip from 'jszip';

// Coletamos todos os arquivos do projeto via Vite raw glob
const srcModules = import.meta.glob<string>('/src/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const publicModules = import.meta.glob<string>('/public/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const supabaseModules = import.meta.glob<string>('/supabase/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const rootModules = import.meta.glob<string>(
  ['/*.json', '/*.html', '/*.sql', '/*.ts', '/*.md', '/*.example'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  }
);

export interface GitHubConfig {
  token: string;
  repo: string;
  branch: string;
}

const STORAGE_KEY_TOKEN = 'autolava_github_token';
const STORAGE_KEY_REPO = 'autolava_github_repo';
const STORAGE_KEY_BRANCH = 'autolava_github_branch';

export function getStoredGitHubConfig(): GitHubConfig {
  return {
    token: localStorage.getItem(STORAGE_KEY_TOKEN) || '',
    repo: localStorage.getItem(STORAGE_KEY_REPO) || 'geraldosaantos-lgtm/saantos',
    branch: localStorage.getItem(STORAGE_KEY_BRANCH) || 'main',
  };
}

export function saveGitHubConfig(config: Partial<GitHubConfig>): void {
  if (config.token !== undefined) {
    if (config.token.trim()) {
      localStorage.setItem(STORAGE_KEY_TOKEN, config.token.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  }
  if (config.repo !== undefined) {
    localStorage.setItem(STORAGE_KEY_REPO, config.repo.trim());
  }
  if (config.branch !== undefined) {
    localStorage.setItem(STORAGE_KEY_BRANCH, config.branch.trim());
  }
}

/**
 * Retorna todos os arquivos do projeto normalizados com caminho relativo.
 */
export function getAllProjectFiles(): Record<string, string> {
  const files: Record<string, string> = {};

  const addModuleSet = (modules: Record<string, string>) => {
    for (const [path, content] of Object.entries(modules)) {
      if (typeof content !== 'string') continue;
      // Normaliza /src/App.tsx -> src/App.tsx
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      files[cleanPath] = content;
    }
  };

  addModuleSet(srcModules);
  addModuleSet(publicModules);
  addModuleSet(supabaseModules);
  addModuleSet(rootModules);

  // Adiciona arquivos de configuração essenciais se faltarem
  if (!files['.gitignore']) {
    files['.gitignore'] = `node_modules\ndist\n.DS_Store\n*.local\n.env\n`;
  }

  return files;
}

/**
 * Gera um arquivo ZIP contendo todo o projeto e dispara o download no navegador.
 */
export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();
  const files = getAllProjectFiles();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autolava-sistema-completo-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface PushResult {
  success: boolean;
  commitUrl?: string;
  commitSha?: string;
  error?: string;
  filesCount?: number;
}

/**
 * Envia todas as alterações diretamente para o repositório no GitHub via API REST
 */
export async function pushToGitHub(
  token: string,
  repoFullName: string,
  branch: string = 'main',
  commitMessage?: string,
  onProgress?: (message: string) => void
): Promise<PushResult> {
  const cleanToken = token.trim();
  const cleanRepo = repoFullName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const cleanBranch = (branch || 'main').trim();

  if (!cleanToken) {
    return { success: false, error: 'Token do GitHub não fornecido. Gere um Personal Access Token com permissão "repo".' };
  }
  if (!cleanRepo || !cleanRepo.includes('/')) {
    return { success: false, error: 'Nome do repositório inválido. Deve ser no formato: usuario/repositorio (ex: geraldosaantos-lgtm/saantos)' };
  }

  const [owner, repo] = cleanRepo.split('/');
  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    onProgress?.('Validando autenticação no GitHub...');
    // 1. Testa token
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, error: 'Token do GitHub inválido ou expirado. Verifique o token e tente novamente.' };
      }
      return { success: false, error: `Erro de autenticação no GitHub (status ${userRes.status}).` };
    }

    onProgress?.(`Verificando o repositório ${owner}/${repo}...`);
    // 2. Testa existência do repositório
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return {
          success: false,
          error: `Repositório "${owner}/${repo}" não foi encontrado no GitHub. Certifique-se de criá-lo em github.com/new antes de enviar!`,
        };
      }
      return { success: false, error: `Erro ao consultar repositório (status ${repoRes.status}).` };
    }

    onProgress?.(`Localizando branch "${cleanBranch}"...`);
    // 3. Busca a referência da branch
    let latestCommitSha: string | null = null;
    let baseTreeSha: string | null = null;

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${cleanBranch}`, { headers });
    if (refRes.ok) {
      const refData = await refRes.json();
      latestCommitSha = refData.object?.sha || null;

      if (latestCommitSha) {
        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          baseTreeSha = commitData.tree?.sha || null;
        }
      }
    }

    onProgress?.('Preparando arquivos do projeto...');
    const files = getAllProjectFiles();
    const fileEntries = Object.entries(files);

    if (fileEntries.length === 0) {
      return { success: false, error: 'Nenhum arquivo encontrado para envio.' };
    }

    onProgress?.(`Enviando árvore com ${fileEntries.length} arquivos para o GitHub...`);
    // 4. Cria a árvore Git (Git Tree)
    // O GitHub aceita criar os blobs diretamente no array da árvore se fornecermos o "content"
    const treePayload: Array<{
      path: string;
      mode: string;
      type: string;
      content: string;
    }> = fileEntries.map(([path, content]) => ({
      path,
      mode: '100644',
      type: 'blob',
      content,
    }));

    const treeBody: Record<string, unknown> = {
      tree: treePayload,
    };
    if (baseTreeSha) {
      treeBody.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(treeBody),
    });

    if (!treeRes.ok) {
      const errJson = await treeRes.json().catch(() => ({}));
      return { success: false, error: `Falha ao criar árvore de arquivos no GitHub: ${errJson.message || treeRes.statusText}` };
    }

    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    onProgress?.('Criando commit com as atualizações...');
    // 5. Cria o Commit
    const finalCommitMsg =
      commitMessage?.trim() ||
      `Atualização AutoLava - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const commitPayload: Record<string, unknown> = {
      message: finalCommitMsg,
      tree: newTreeSha,
      parents: latestCommitSha ? [latestCommitSha] : [],
    };

    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commitPayload),
    });

    if (!newCommitRes.ok) {
      const errJson = await newCommitRes.json().catch(() => ({}));
      return { success: false, error: `Falha ao registrar commit: ${errJson.message || newCommitRes.statusText}` };
    }

    const newCommitData = await newCommitRes.json();
    const newCommitSha = newCommitData.sha;

    onProgress?.(`Atualizando branch "${cleanBranch}" no repositório...`);
    // 6. Atualiza a referência da branch
    if (latestCommitSha) {
      // Atualiza branch existente
      const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${cleanBranch}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: true,
        }),
      });

      if (!updateRefRes.ok) {
        const errJson = await updateRefRes.json().catch(() => ({}));
        return { success: false, error: `Falha ao atualizar branch ${cleanBranch}: ${errJson.message || updateRefRes.statusText}` };
      }
    } else {
      // Cria a branch inicial
      const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${cleanBranch}`,
          sha: newCommitSha,
        }),
      });

      if (!createRefRes.ok) {
        // Se a criação falhou, tenta com PATCH
        const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${cleanBranch}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            sha: newCommitSha,
            force: true,
          }),
        });

        if (!updateRefRes.ok) {
          const errJson = await createRefRes.json().catch(() => ({}));
          return { success: false, error: `Falha ao criar referência para ${cleanBranch}: ${errJson.message || createRefRes.statusText}` };
        }
      }
    }

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommitSha}`;
    return {
      success: true,
      commitUrl,
      commitSha: newCommitSha.slice(0, 7),
      filesCount: fileEntries.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Erro durante a sincronização com GitHub: ${message}`,
    };
  }
}
