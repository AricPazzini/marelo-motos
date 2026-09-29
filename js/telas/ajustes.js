// =====================================================================
//  Configuracoes  (somente o perfil Dono)
//  RNFR-07.3 — o percentual de comissao e parametrizavel
//  RNFR-03.2 / RF-05 — prazos de alerta e da regua de cobranca
//  RNFS-06 — copia de seguranca da base de dados
// =====================================================================

import { api, escapar, recado, tabela } from '../nucleo.js';
import { recarregar } from '../app.js';

export function abas() {
  return [
    { id: 'parametros', nome: 'Parâmetros da loja' },
    { id: 'sistema', nome: 'Sistema e backup' },
  ];
}

export async function montar(area, contexto, aba) {
  if (aba === 'sistema') return montarSistema(area, contexto);
  return montarParametros(area);
}

async function montarParametros(area) {
  const parametros = await api.ler('/api/parametros');

  area.innerHTML = `
    <h1 class="titulo">Parâmetros da loja</h1>
    <p class="subtitulo">
      Estes valores mudam o comportamento do sistema sem precisar de
      alteração no programa.
    </p>

    <div class="card" style="max-width:760px">
      <form id="formulario">
        ${parametros.map((p) => `
          <div class="campo">
            <label for="${escapar(p.chave)}">${escapar(p.descricao || p.chave)}</label>
            <input name="${escapar(p.chave)}" id="${escapar(p.chave)}" value="${escapar(p.valor)}">
            <p class="dica">chave: <code>${escapar(p.chave)}</code></p>
          </div>`).join('')}
        <button type="submit" class="btn" style="margin-top:20px">Salvar parâmetros</button>
      </form>
    </div>`;

  document.getElementById('formulario').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = {};
    for (const campo of evento.target.querySelectorAll('[name]')) {
      dados[campo.name] = campo.value.trim();
    }
    await api.alterar('/api/parametros', dados);
    recado('Parâmetros salvos.');
    recarregar();
  });
}

async function montarSistema(area, contexto) {
  area.innerHTML = `
    <h1 class="titulo">Sistema e backup</h1>
    <p class="subtitulo">Informações técnicas e cópia de segurança da base de dados</p>

    <div class="grade g2">
      <div class="card">
        <h3>Cópia de segurança</h3>
        <p style="font-size:13px;color:var(--texto-medio);line-height:1.7;margin-bottom:18px">
          Gera agora uma cópia completa do banco de dados na pasta
          <code>banco/backups</code>. No sistema em produção, essa cópia
          será feita automaticamente todos os dias, com retenção mínima de
          trinta dias (RNFS-06).
        </p>
        <button class="btn" id="backup">Gerar cópia agora</button>
        <p id="resultado-backup" style="font-size:12px;color:var(--texto-fraco);margin-top:14px"></p>
      </div>

      <div class="card">
        <h3>Sessão atual</h3>
        <ul class="lista-simples">
          <li><span>Usuário</span><b>${escapar(contexto.usuario.nome)}</b></li>
          <li><span>E-mail</span><b>${escapar(contexto.usuario.email)}</b></li>
          <li><span>Perfil</span><b>${escapar(contexto.usuario.perfil)}</b></li>
          <li><span>Setor</span><b>${escapar(contexto.usuario.setor)}</b></li>
        </ul>
        <p style="font-size:11.5px;color:var(--texto-fraco);margin-top:14px;line-height:1.6">
          As senhas são guardadas com criptografia (scrypt) e nunca em texto
          puro. A sessão expira em 8 horas.
        </p>
      </div>
    </div>

    <div class="card mt">
      <h3>Permissões deste perfil</h3>
      ${tabela({
        colunas: [
          { titulo: 'Operação', valor: (l) => escapar(l.chave) },
          { titulo: 'Situação', valor: (l) =>
            `<span class="tag ${l.valor ? 't-ok' : 't-erro'}">${l.valor ? 'liberado' : 'bloqueado'}</span>` },
        ],
        linhas: Object.entries(contexto.permissoes).map(([chave, valor]) => ({ chave, valor })),
      })}
    </div>`;

  document.getElementById('backup').addEventListener('click', async (evento) => {
    evento.target.disabled = true;
    try {
      const r = await api.criar('/api/backup', {});
      document.getElementById('resultado-backup').textContent = `Cópia gerada em: ${r.arquivo}`;
      recado('Cópia de segurança gerada.');
    } finally {
      evento.target.disabled = false;
    }
  });
}
