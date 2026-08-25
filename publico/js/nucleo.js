// =====================================================================
//  Nucleo das telas
//  Funcoes que todas as telas usam: conversa com a API, formatacao de
//  numeros e datas, montagem de tabelas e janelas.
// =====================================================================

// ---------------------------------------------------------------------
// Conversa com o servidor
// ---------------------------------------------------------------------
export async function pedir(caminho, opcoes = {}) {
  // Duas formas de responder, com o MESMO resultado:
  //  - sistema real: chama o servidor por HTTP;
  //  - versao publicada no GitHub Pages: nao existe servidor, entao as
  //    mesmas rotas rodam dentro do navegador (ver ferramentas/web).
  const { status, ok, dados } = globalThis.MARELO_LOCAL
    ? globalThis.MARELO_LOCAL.chamar(caminho, opcoes)
    : await viaServidor(caminho, opcoes);

  // Sessao expirada: volta para o login
  if (status === 401) {
    window.location.href = './index.html';
    throw new Error('sessao encerrada');
  }

  if (!ok) throw new ErroDoServidor(dados.erro || 'Erro inesperado.', status);
  return dados;
}

async function viaServidor(caminho, opcoes) {
  const resposta = await fetch(caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });
  const dados = await resposta.json().catch(() => ({}));
  return { status: resposta.status, ok: resposta.ok, dados };
}

export const api = {
  ler: (caminho) => pedir(caminho),
  criar: (caminho, corpo) => pedir(caminho, { method: 'POST', corpo }),
  alterar: (caminho, corpo) => pedir(caminho, { method: 'PUT', corpo }),
};

export class ErroDoServidor extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

// ---------------------------------------------------------------------
// Formatacao
// ---------------------------------------------------------------------
export const dinheiro = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  });

export const dinheiroCurto = (valor) => {
  const n = Number(valor) || 0;
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2).replace('.', ',')} mi`;
  if (Math.abs(n) >= 1000) return `R$ ${Math.round(n / 1000)} mil`;
  return dinheiro(n);
};

export const numero = (valor) => (Number(valor) || 0).toLocaleString('pt-BR');

export function data(texto) {
  if (!texto) return '—';
  const so = String(texto).slice(0, 10).split('-');
  if (so.length !== 3) return texto;
  return `${so[2]}/${so[1]}/${so[0]}`;
}

export function dataHora(texto) {
  if (!texto) return '—';
  const [dia, hora] = String(texto).split(' ');
  return `${data(dia)}${hora ? ' às ' + hora.slice(0, 5) : ''}`;
}

export const mesPorExtenso = (competencia) => {
  const nomes = ['janeiro','fevereiro','março','abril','maio','junho',
                 'julho','agosto','setembro','outubro','novembro','dezembro'];
  const [ano, mes] = String(competencia).split('-');
  return `${nomes[Number(mes) - 1]} de ${ano}`;
};

export const escapar = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------
// Etiquetas de situacao
// ---------------------------------------------------------------------
const ETIQUETAS = {
  disponivel:  ['Disponível', 't-ok'],
  reservada:   ['Reservada', 't-info'],
  preparacao:  ['Em preparação', 't-alerta'],
  vendida:     ['Vendida', 't-neutro'],
  aberta:      ['Em aberto', 't-info'],
  vencida:     ['Vencida', 't-erro'],
  paga:        ['Paga', 't-ok'],
  cancelada:   ['Cancelada', 't-neutro'],
  ativo:       ['Ativo', 't-ok'],
  quitado:     ['Quitado', 't-ok'],
  cancelado:   ['Cancelado', 't-erro'],
  ferias:      ['Em férias', 't-info'],
  desligado:   ['Desligado', 't-neutro'],
  andamento:   ['Em andamento', 't-alerta'],
  resolvido:   ['Resolvido', 't-ok'],
  atrasado:    ['Atrasado', 't-erro'],
  lead:          ['Lead novo', 't-neutro'],
  contato:       ['Em contato', 't-info'],
  proposta:      ['Proposta', 't-alerta'],
  financiamento: ['Financiamento', 't-info'],
  fechada:       ['Venda fechada', 't-ok'],
  perdida:       ['Perdida', 't-erro'],
  avista:           ['À vista', 't-ok'],
  financiado:       ['Financiado', 't-info'],
  entrada_parcelas: ['Entrada + parcelas', 't-info'],
};

export function etiqueta(chave) {
  const [texto, classe] = ETIQUETAS[chave] || [chave, 't-neutro'];
  return `<span class="tag ${classe}">${escapar(texto)}</span>`;
}

export const rotulo = (chave) => (ETIQUETAS[chave] || [chave])[0];

// ---------------------------------------------------------------------
// Avisos flutuantes
// ---------------------------------------------------------------------
export function recado(mensagem, tipo = 'ok') {
  let caixa = document.querySelector('.avisos');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'avisos';
    document.body.appendChild(caixa);
  }
  const item = document.createElement('div');
  item.className = `recado ${tipo}`;
  item.setAttribute('role', 'status');
  item.textContent = mensagem;
  caixa.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

// ---------------------------------------------------------------------
// Janela modal
// ---------------------------------------------------------------------
export function janela({ titulo, descricao = '', corpo, acoes = [], largo = false }) {
  const fundo = document.createElement('div');
  fundo.className = 'fundo-modal';

  fundo.innerHTML = `
    <div class="modal ${largo ? 'largo' : ''}" role="dialog" aria-modal="true" aria-label="${escapar(titulo)}">
      <div class="modal-topo">
        <div>
          <h2>${escapar(titulo)}</h2>
          ${descricao ? `<p>${escapar(descricao)}</p>` : ''}
        </div>
        <button class="fechar" aria-label="Fechar">×</button>
      </div>
      <div class="modal-corpo"></div>
      ${acoes.length ? '<div class="modal-rodape"></div>' : ''}
    </div>`;

  fundo.querySelector('.modal-corpo').innerHTML = corpo;

  const fechar = () => {
    fundo.remove();
    document.removeEventListener('keydown', aoTeclar);
  };
  const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };

  fundo.querySelector('.fechar').addEventListener('click', fechar);
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  document.addEventListener('keydown', aoTeclar);

  const rodape = fundo.querySelector('.modal-rodape');
  for (const acao of acoes) {
    const botao = document.createElement('button');
    botao.className = `btn ${acao.estilo || ''}`;
    botao.textContent = acao.texto;
    botao.addEventListener('click', async () => {
      if (!acao.aoClicar) return fechar();
      botao.disabled = true;
      try {
        const manter = await acao.aoClicar({ fundo, fechar });
        if (manter !== 'manter') fechar();
      } catch (erro) {
        mostrarErroNaJanela(fundo, erro.message);
      } finally {
        botao.disabled = false;
      }
    });
    rodape.appendChild(botao);
  }

  document.body.appendChild(fundo);
  const primeiro = fundo.querySelector('input,select,textarea');
  if (primeiro) primeiro.focus();
  return { fundo, fechar };
}

export function mostrarErroNaJanela(fundo, mensagem) {
  let caixa = fundo.querySelector('.aviso.erro');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'aviso erro';
    fundo.querySelector('.modal-corpo').prepend(caixa);
  }
  caixa.textContent = mensagem;
  caixa.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Le todos os campos com [name] de dentro da janela
export function lerCampos(fundo) {
  const dados = {};
  for (const campo of fundo.querySelectorAll('[name]')) {
    dados[campo.name] = campo.type === 'checkbox' ? campo.checked : campo.value.trim();
  }
  return dados;
}

export function confirmar(pergunta, detalhe = '') {
  return new Promise((resolve) => {
    janela({
      titulo: pergunta,
      descricao: detalhe,
      corpo: '',
      acoes: [
        { texto: 'Cancelar', estilo: 'linha', aoClicar: () => resolve(false) },
        { texto: 'Confirmar', aoClicar: () => resolve(true) },
      ],
    });
  });
}

// ---------------------------------------------------------------------
// Montagem de tabelas
// ---------------------------------------------------------------------
export function tabela({ colunas, linhas, vazio = 'Nenhum registro encontrado.' }) {
  if (!linhas.length) {
    return `<div class="vazio"><span class="ic">📭</span>${escapar(vazio)}</div>`;
  }
  const cabecalho = colunas
    .map((c) => `<th class="${c.alinha === 'direita' ? 'num' : ''}">${escapar(c.titulo)}</th>`)
    .join('');
  const corpo = linhas.map((linha) => {
    const celulas = colunas
      .map((c) => `<td class="${c.alinha === 'direita' ? 'num' : ''}">${c.valor(linha)}</td>`)
      .join('');
    return `<tr class="${linha.__destaque ? 'destaque-linha' : ''}">${celulas}</tr>`;
  }).join('');
  return `<table><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
}

export const carregando = () => '<div class="carregando">Carregando…</div>';

export const semPermissao = (mensagem) => `
  <div class="bloqueio">
    <div class="ic">🔒</div>
    <h3>Acesso restrito</h3>
    <p>${escapar(mensagem)}</p>
  </div>`;
