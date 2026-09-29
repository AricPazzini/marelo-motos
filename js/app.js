// =====================================================================
//  Montagem do sistema: sessao, menu e navegacao entre os modulos.
//
//  O menu e montado a partir das permissoes que o servidor devolveu.
//  Esconder o item e apenas conforto: quem barra de verdade e o
//  servidor, a cada chamada da API.
// =====================================================================

import { api, recado, carregando, semPermissao, escapar } from './nucleo.js';
import { ligarBotaoTema } from './tema.js';

import * as painel      from './telas/painel.js';
import * as meuPainel   from './telas/meu-painel.js';
import * as comercial   from './telas/comercial.js';
import * as estoque     from './telas/estoque.js';
import * as financeiro  from './telas/financeiro.js';
import * as rh          from './telas/rh.js';
import * as ajustes     from './telas/ajustes.js';

// ---------------------------------------------------------------------
// Modulos do sistema
// ---------------------------------------------------------------------
const MODULOS = [
  { id: 'painel',     nome: 'Dashboard',       icone: '📊', permissao: 'painel.gerencial', tela: painel },
  { id: 'meu-painel', nome: 'Meu Painel',      icone: '🎯', permissao: 'livre',            tela: meuPainel, sePerfil: 'funcionario' },
  { id: 'comercial',  nome: 'Comercial',       icone: '🤝', permissao: 'comercial.ler',    tela: comercial },
  { id: 'estoque',    nome: 'Estoque',         icone: '🏍️', permissao: 'estoque.ler',      tela: estoque },
  { id: 'financeiro', nome: 'Financeiro',      icone: '💰', permissao: 'financeiro.ler',   tela: financeiro },
  { id: 'rh',         nome: 'Recursos Humanos',icone: '👥', permissao: 'rh.ler',           tela: rh },
  { id: 'ajustes',    nome: 'Configurações',   icone: '⚙️', permissao: 'parametros',       tela: ajustes },
];

export const contexto = {
  usuario: null,
  permissoes: {},
  loja: {},
  moduloAtual: null,
};

const elMenu     = document.getElementById('menu');
const elPagina   = document.getElementById('pagina');
const elAbas     = document.getElementById('abas');
const elModulo   = document.getElementById('modulo-atual');

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
async function iniciar() {
  let sessao;
  try {
    sessao = await api.ler('/api/sessao');
  } catch {
    window.location.href = './index.html';
    return;
  }

  contexto.usuario = sessao.usuario;
  contexto.permissoes = sessao.permissoes;
  contexto.loja = sessao.loja;

  document.getElementById('usuario-nome').textContent = sessao.usuario.nome;
  document.getElementById('usuario-funcao').textContent = sessao.usuario.cargo;
  document.getElementById('avatar').textContent = sessao.usuario.perfil === 'dono' ? '👔' : '🧑‍💼';
  document.getElementById('pilula-perfil').textContent =
    sessao.usuario.perfil === 'dono' ? 'Perfil: Proprietário' : `Perfil: ${sessao.usuario.cargo}`;
  document.getElementById('pilula-loja').textContent = sessao.loja.cidade || 'Itapetininga — SP';

  montarMenu();
  ligarBotaoTema(document.getElementById('botao-tema'));

  window.addEventListener('hashchange', abrirDoEndereco);
  abrirDoEndereco();
}

function modulosVisiveis() {
  return MODULOS.filter((m) => {
    if (m.sePerfil && contexto.usuario.perfil !== m.sePerfil) return false;
    if (m.permissao === 'livre') return true;
    return contexto.permissoes[m.permissao];
  });
}

function montarMenu() {
  elMenu.innerHTML = '';
  for (const modulo of modulosVisiveis()) {
    const botao = document.createElement('button');
    botao.className = 'item';
    botao.dataset.modulo = modulo.id;
    botao.innerHTML = `<span class="ic">${modulo.icone}</span><span>${escapar(modulo.nome)}</span>`;
    botao.addEventListener('click', () => { window.location.hash = modulo.id; });
    elMenu.appendChild(botao);
  }
}

// ---------------------------------------------------------------------
// Navegacao
// ---------------------------------------------------------------------
function abrirDoEndereco() {
  const [id, aba] = (window.location.hash.replace('#', '') || '').split('/');
  const visiveis = modulosVisiveis();
  const modulo = visiveis.find((m) => m.id === id) || visiveis[0];
  if (!modulo) {
    elPagina.innerHTML = semPermissao('Seu usuário não tem nenhum módulo liberado. Procure o proprietário.');
    return;
  }
  abrir(modulo, aba);
}

async function abrir(modulo, aba) {
  contexto.moduloAtual = modulo;

  for (const item of elMenu.querySelectorAll('.item')) {
    item.classList.toggle('ativo', item.dataset.modulo === modulo.id);
  }
  elModulo.textContent = modulo.nome;
  elPagina.innerHTML = carregando();

  // Abas do modulo, quando ele tiver mais de uma tela
  const abas = modulo.tela.abas ? modulo.tela.abas(contexto) : [];
  const abaAtual = abas.find((a) => a.id === aba) || abas[0];

  if (abas.length > 1) {
    elAbas.classList.remove('oculto');
    elAbas.innerHTML = '';
    for (const item of abas) {
      const botao = document.createElement('button');
      botao.className = 'aba' + (item.id === abaAtual.id ? ' ativa' : '');
      botao.textContent = item.nome;
      botao.addEventListener('click', () => { window.location.hash = `${modulo.id}/${item.id}`; });
      elAbas.appendChild(botao);
    }
  } else {
    elAbas.classList.add('oculto');
    elAbas.innerHTML = '';
  }

  try {
    await modulo.tela.montar(elPagina, contexto, abaAtual?.id);
  } catch (erro) {
    if (erro.status === 403) {
      elPagina.innerHTML = semPermissao(erro.message);
      return;
    }
    elPagina.innerHTML = `
      <div class="bloqueio">
        <div class="ic">⚠️</div>
        <h3>Não foi possível carregar</h3>
        <p>${escapar(erro.message)}</p>
      </div>`;
  }
}

// Recarrega a tela atual — usado depois de gravar alguma coisa
export function recarregar() {
  if (contexto.moduloAtual) {
    const aba = (window.location.hash.replace('#', '') || '').split('/')[1];
    abrir(contexto.moduloAtual, aba);
  }
}

// ---------------------------------------------------------------------
// Busca global (RF-10)
//
// Um campo só, atravessando clientes, estoque, contratos e SAC. Quem
// decide o que cada perfil encontra é o servidor: a tela apenas desenha
// o que voltou.
// ---------------------------------------------------------------------
const elBusca = document.getElementById('busca-global');
const elResultados = document.getElementById('busca-resultados');
let horaDaBusca;
let buscaAtual = 0;

function fecharBusca() {
  elResultados.classList.add('oculto');
  elResultados.innerHTML = '';
  elBusca.setAttribute('aria-expanded', 'false');
}

function realcar(texto, termo) {
  const alvo = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapar(texto).replace(new RegExp(alvo, 'gi'), (achado) => `<mark>${achado}</mark>`);
}

async function buscar(termo) {
  const meuTurno = ++buscaAtual;
  let dados;
  try {
    dados = await api.ler(`/api/busca?q=${encodeURIComponent(termo)}`);
  } catch {
    return; // a busca é conveniência: se falhar, não atrapalha o resto da tela
  }
  if (meuTurno !== buscaAtual) return; // resposta fora de ordem, descarta

  if (!dados.total) {
    elResultados.innerHTML =
      `<p class="busca-vazio">Nada encontrado para “${escapar(termo)}”.</p>`;
  } else {
    elResultados.innerHTML = dados.grupos.map((g) => `
      <div class="busca-grupo">
        <h4><span aria-hidden="true">${g.icone}</span> ${escapar(g.modulo)}</h4>
        ${g.itens.map((i) => `
          <button class="busca-item" role="option" data-destino="${g.destino}">
            <span class="bt">${realcar(i.titulo, termo)}</span>
            <span class="bd">${realcar(i.detalhe || '', termo)}</span>
          </button>`).join('')}
      </div>`).join('');

    for (const item of elResultados.querySelectorAll('.busca-item')) {
      item.addEventListener('click', () => {
        window.location.hash = item.dataset.destino;
        elBusca.value = '';
        fecharBusca();
      });
    }
  }

  elResultados.classList.remove('oculto');
  elBusca.setAttribute('aria-expanded', 'true');
}

elBusca.addEventListener('input', () => {
  const termo = elBusca.value.trim();
  clearTimeout(horaDaBusca);
  if (termo.length < 2) { fecharBusca(); return; }
  horaDaBusca = setTimeout(() => buscar(termo), 220);
});

// Teclado: setas percorrem, Enter abre, Esc fecha (RNFS-07)
elBusca.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') { elBusca.value = ''; fecharBusca(); return; }
  const itens = [...elResultados.querySelectorAll('.busca-item')];
  if (!itens.length) return;

  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    evento.preventDefault();
    const atual = itens.findIndex((i) => i.classList.contains('ativo'));
    const proximo = evento.key === 'ArrowDown'
      ? (atual + 1) % itens.length
      : (atual <= 0 ? itens.length - 1 : atual - 1);
    itens.forEach((i) => i.classList.remove('ativo'));
    itens[proximo].classList.add('ativo');
    itens[proximo].scrollIntoView({ block: 'nearest' });
  }

  if (evento.key === 'Enter') {
    evento.preventDefault();
    (itens.find((i) => i.classList.contains('ativo')) || itens[0]).click();
  }
});

document.addEventListener('click', (evento) => {
  if (!evento.target.closest('.busca')) fecharBusca();
});

// ---------------------------------------------------------------------
// Sair
// ---------------------------------------------------------------------
document.getElementById('botao-sair').addEventListener('click', async () => {
  try { await api.criar('/api/sair', {}); } catch { /* segue para o login mesmo assim */ }
  window.location.href = './index.html';
});

iniciar().catch((erro) => {
  recado(erro.message, 'erro');
});
