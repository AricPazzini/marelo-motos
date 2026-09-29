// =====================================================================
//  Tema claro / escuro
//
//  Tres estados, nesta ordem de prioridade:
//    1. o que o usuario escolheu (fica guardado no navegador);
//    2. o tema do proprio sistema operacional, se ele nunca escolheu;
//    3. claro, se o navegador nao souber informar.
//
//  A aplicacao do tema acontece no <head> de cada pagina, antes de
//  desenhar qualquer coisa — senao a tela pisca branca por um instante
//  antes de escurecer. Este arquivo cuida so do botao.
// =====================================================================

const CHAVE = 'marelo_tema';

export function temaAtual() {
  try {
    return localStorage.getItem(CHAVE) || 'sistema';
  } catch {
    return 'sistema'; // navegador com armazenamento bloqueado
  }
}

export function aplicarTema(tema) {
  if (tema === 'sistema') {
    document.documentElement.removeAttribute('data-tema');
  } else {
    document.documentElement.setAttribute('data-tema', tema);
  }
  try {
    if (tema === 'sistema') localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, tema);
  } catch { /* sem armazenamento: vale so para esta aba */ }
}

// Qual tema esta valendo na tela agora, considerando o sistema
export function temaEfetivo() {
  const escolhido = temaAtual();
  if (escolhido !== 'sistema') return escolhido;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

const PROXIMO = { claro: 'escuro', escuro: 'claro' };
const ROTULO = {
  claro: { icone: '🌙', texto: 'Modo escuro', titulo: 'Mudar para o modo escuro' },
  escuro: { icone: '☀️', texto: 'Modo claro', titulo: 'Mudar para o modo claro' },
};

// Liga um botao ao alternador. O botao mostra o que VAI acontecer se
// for clicado, nao o estado atual — e o que as pessoas esperam.
export function ligarBotaoTema(botao, { comTexto = true } = {}) {
  if (!botao) return;

  const desenhar = () => {
    const atual = temaEfetivo();
    const r = ROTULO[atual];
    botao.innerHTML = comTexto
      ? `<span aria-hidden="true">${r.icone}</span> ${r.texto}`
      : `<span aria-hidden="true">${r.icone}</span>`;
    botao.setAttribute('title', r.titulo);
    botao.setAttribute('aria-label', r.titulo);
  };

  botao.addEventListener('click', () => {
    aplicarTema(PROXIMO[temaEfetivo()]);
    desenhar();
  });

  // Se o usuario nunca escolheu e o sistema muda de tema, acompanhamos
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => { if (temaAtual() === 'sistema') desenhar(); });

  desenhar();
}
