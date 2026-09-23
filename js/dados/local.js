// =====================================================================
//  "Servidor" da versao publicada no GitHub Pages
//
//  O GitHub Pages so entrega arquivos parados: nao existe servidor para
//  responder as chamadas da API. Este arquivo faz o papel dele DENTRO
//  do navegador, usando o mesmo api.js, auth.js e regras.js do projeto.
//
//  Ou seja: as rotas, as regras de negocio e a matriz de permissoes sao
//  exatamente as mesmas do sistema real. O que muda e apenas onde o
//  codigo roda.
//
//  ATENCAO, e isto precisa ficar claro na apresentacao:
//  aqui a verificacao de permissao acontece no navegador do visitante,
//  entao ela NAO e uma barreira de seguranca de verdade — e uma
//  demonstracao do comportamento. No sistema real (servidor/), quem
//  barra e o servidor, fora do alcance do usuario.
// =====================================================================

import { prepararBanco } from './banco.js';
import { encontrarRota, pode, usuarioDaSessao } from './api.js';
import { entrar, sair } from './auth.js';
import { ErroDeRegra } from './regras.js';

let token = null;

async function iniciar() {
  await prepararBanco();
}

function chamar(caminho, opcoes = {}) {
  const metodo = opcoes.method || 'GET';
  const [semQuery, textoQuery = ''] = caminho.split('?');
  const query = Object.fromEntries(new URLSearchParams(textoQuery));

  try {
    const alvo = encontrarRota(metodo, semQuery);
    if (!alvo) return { ok: false, status: 404, dados: { erro: 'Recurso nao encontrado.' } };

    const usuario = usuarioDaSessao(token);

    if (alvo.permissao !== null) {
      if (!usuario) {
        return { ok: false, status: 401, dados: { erro: 'Sessao encerrada. Entre novamente.' } };
      }
      if (alvo.permissao !== 'livre' && !pode(usuario, alvo.permissao)) {
        return {
          ok: false, status: 403,
          dados: {
            erro: 'Seu perfil de acesso nao permite esta operacao.',
            permissaoExigida: alvo.permissao,
          },
        };
      }
    }

    const corpo = opcoes.corpo || {};
    const resultado = alvo.manipulador({ params: alvo.params, corpo, query, usuario, token });

    // O login e a saida controlam o token da sessao
    if (semQuery === '/api/login' && resultado?.token) {
      token = resultado.token;
      sessionStorage.setItem('marelo_sessao', token);
    }
    if (semQuery === '/api/sair') {
      sair(token);
      token = null;
      sessionStorage.removeItem('marelo_sessao');
    }

    return { ok: true, status: 200, dados: resultado ?? { ok: true } };
  } catch (erro) {
    if (erro instanceof ErroDeRegra) {
      return { ok: false, status: erro.status || 400, dados: { erro: erro.message } };
    }
    const texto = String(erro?.message || erro);
    if (texto.includes('UNIQUE constraint')) {
      return { ok: false, status: 400, dados: { erro: 'Ja existe um registro com este dado unico.' } };
    }
    console.error('[erro]', erro);
    return { ok: false, status: 500, dados: { erro: `Erro interno: ${texto}` } };
  }
}

// Ao recarregar a pagina, o banco e montado de novo e as sessoes se
// perdem. Reentramos com o mesmo usuario para nao cair no login a cada
// F5 durante uma demonstracao.
function restaurarSessao(email) {
  const sessao = entrar(email, 'marelo123');
  if (sessao) {
    token = sessao.token;
    sessionStorage.setItem('marelo_sessao', token);
    sessionStorage.setItem('marelo_email', email);
    return true;
  }
  return false;
}

globalThis.MARELO_LOCAL = { iniciar, chamar, restaurarSessao };
