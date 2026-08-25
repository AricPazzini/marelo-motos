// =====================================================================
//  Autenticacao e permissoes de acesso
//
//  RNFS-01 - o acesso e feito por login e senha individuais, com o
//            perfil de permissao vinculado ao usuario.
//
//  A checagem acontece AQUI, no servidor. As telas apenas escondem o
//  que o usuario nao pode usar; quem realmente barra e esta camada.
// =====================================================================

// Tudo o que depende da plataforma (banco, criptografia, sorteio do
// token) vem de banco.js. Assim este arquivo roda igual no servidor e
// na versao publicada no GitHub Pages, que usa outro banco.js.
import { um, executar, conferirSenha, gerarToken } from './banco.js';

const SESSOES = new Map();
const DURACAO_SESSAO = 8 * 60 * 60 * 1000; // 8 horas

// ---------------------------------------------------------------------
// Matriz de permissoes
// O perfil diz se e Dono ou Funcionario; o setor refina o que o
// funcionario enxerga, como descrito no item Stakeholders do documento.
// ---------------------------------------------------------------------
const PERMISSOES = {
  'painel.gerencial':   ['dono'],                                   // RNFR-08.3
  'comercial.ler':      ['dono', 'comercial', 'administrativo'],
  'comercial.escrever': ['dono', 'comercial'],
  'sac.ler':            ['dono', 'comercial', 'administrativo', 'financeiro'],
  'sac.escrever':       ['dono', 'comercial', 'administrativo'],
  'estoque.ler':        ['dono', 'comercial', 'administrativo', 'financeiro', 'oficina'],
  'estoque.escrever':   ['dono'],                                   // RNFR-03.3
  'financeiro.ler':     ['dono', 'financeiro'],
  'financeiro.escrever':['dono', 'financeiro'],
  'contrato.cancelar':  ['dono'],                                   // RNFR-04.3
  'negativacao':        ['dono'],                                   // RNFR-05.2
  'rh.ler':             ['dono', 'administrativo'],
  'rh.escrever':        ['dono'],
  'folha.ler':          ['dono'],                                   // RNFR-06.1
  'parametros':         ['dono'],
};

// O Dono passa por tudo. O funcionario e avaliado pelo setor.
export function pode(usuario, acao) {
  if (!usuario) return false;
  if (usuario.perfil === 'dono') return true;
  const permitidos = PERMISSOES[acao];
  if (!permitidos) return false;
  return permitidos.includes(usuario.setor);
}

// Lista das permissoes do usuario, enviada as telas para montar o menu.
export function permissoesDe(usuario) {
  const mapa = {};
  for (const acao of Object.keys(PERMISSOES)) mapa[acao] = pode(usuario, acao);
  return mapa;
}

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------
export function entrar(email, senha) {
  const registro = um(
    `SELECT u.id, u.email, u.senha_hash, u.perfil, u.ativo,
            f.id AS funcionario_id, f.nome, f.cargo, f.setor,
            f.percentual_comissao, f.meta_mensal
       FROM usuario u
       LEFT JOIN funcionario f ON f.id = u.funcionario_id
      WHERE lower(u.email) = lower(?)`,
    String(email || '').trim()
  );

  const registrarTentativa = (ok) =>
    executar(
      'INSERT INTO log_acesso (usuario_id, email, sucesso) VALUES (?, ?, ?)',
      registro ? registro.id : null, String(email || '').trim(), ok ? 1 : 0
    );

  if (!registro || !registro.ativo || !conferirSenha(String(senha || ''), registro.senha_hash)) {
    registrarTentativa(false);
    return null;
  }

  registrarTentativa(true);

  const usuario = {
    id: registro.id,
    email: registro.email,
    perfil: registro.perfil,
    funcionarioId: registro.funcionario_id,
    nome: registro.nome,
    cargo: registro.cargo,
    setor: registro.setor,
    percentualComissao: registro.percentual_comissao,
    metaMensal: registro.meta_mensal,
  };

  const token = gerarToken();
  SESSOES.set(token, { usuario, expiraEm: Date.now() + DURACAO_SESSAO });
  return { token, usuario, permissoes: permissoesDe(usuario) };
}

export function sair(token) {
  SESSOES.delete(token);
}

export function usuarioDaSessao(token) {
  if (!token) return null;
  const sessao = SESSOES.get(token);
  if (!sessao) return null;
  if (sessao.expiraEm < Date.now()) {
    SESSOES.delete(token);
    return null;
  }
  return sessao.usuario;
}

export function lerTokenDoCookie(cabecalhoCookie) {
  if (!cabecalhoCookie) return null;
  for (const parte of cabecalhoCookie.split(';')) {
    const [nome, ...resto] = parte.trim().split('=');
    if (nome === 'marelo_sessao') return resto.join('=');
  }
  return null;
}
