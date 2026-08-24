// =====================================================================
//  Camada de banco de dados
//  Abre o arquivo SQLite, aplica o schema e, na primeira execucao,
//  carrega os dados de teste. Nenhuma dependencia externa: usa o
//  modulo node:sqlite que ja vem no Node 22+.
// =====================================================================

import { DatabaseSync } from 'node:sqlite';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_BANCO = join(AQUI, '..', 'banco');
const ARQUIVO_BANCO = process.env.MARELO_DB || join(PASTA_BANCO, 'marelo.db');

export const SENHA_PADRAO = 'marelo123';

let db;

// ---------------------------------------------------------------------
// Senhas: guardadas como scrypt, no formato "salto:hash".
// O sistema nunca armazena nem devolve a senha em texto puro (RNFS-01).
// ---------------------------------------------------------------------
export function gerarHash(senha) {
  const salto = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salto, 64).toString('hex');
  return `${salto}:${hash}`;
}

export function conferirSenha(senha, armazenado) {
  if (!armazenado || !armazenado.includes(':')) return false;
  const [salto, hash] = armazenado.split(':');
  const tentativa = scryptSync(senha, salto, 64);
  const guardado = Buffer.from(hash, 'hex');
  if (tentativa.length !== guardado.length) return false;
  return timingSafeEqual(tentativa, guardado);
}

// ---------------------------------------------------------------------
// Abertura e preparo do banco
// ---------------------------------------------------------------------
export function abrirBanco() {
  if (db) return db;

  mkdirSync(PASTA_BANCO, { recursive: true });
  const primeiraVez = !existsSync(ARQUIVO_BANCO);

  db = new DatabaseSync(ARQUIVO_BANCO);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // O schema usa "IF NOT EXISTS", entao pode ser aplicado sempre.
  db.exec(readFileSync(join(PASTA_BANCO, 'schema.sql'), 'utf8'));

  if (primeiraVez) {
    console.log('  Banco novo detectado — carregando os dados de teste...');
    db.exec(readFileSync(join(PASTA_BANCO, 'seed.sql'), 'utf8'));
    definirSenhasPendentes();
    console.log('  Dados de teste carregados.');
  } else {
    definirSenhasPendentes();
  }

  return db;
}

// O seed.sql grava 'DEFINIR' na coluna senha_hash; aqui a senha padrao
// vira hash de verdade. Assim o arquivo .sql nunca contem senha.
function definirSenhasPendentes() {
  const pendentes = db.prepare("SELECT id FROM usuario WHERE senha_hash = 'DEFINIR'").all();
  if (pendentes.length === 0) return;
  const atualizar = db.prepare('UPDATE usuario SET senha_hash = ? WHERE id = ?');
  for (const u of pendentes) atualizar.run(gerarHash(SENHA_PADRAO), u.id);
}

// ---------------------------------------------------------------------
// Atalhos de consulta
// ---------------------------------------------------------------------
export function todos(sql, ...params) {
  return abrirBanco().prepare(sql).all(...params);
}

export function um(sql, ...params) {
  return abrirBanco().prepare(sql).get(...params);
}

export function executar(sql, ...params) {
  return abrirBanco().prepare(sql).run(...params);
}

// Executa varias operacoes como uma unica transacao. Se qualquer passo
// falhar, nada e gravado — usado no fechamento da venda (RF-04).
export function emTransacao(fn) {
  const banco = abrirBanco();
  banco.exec('BEGIN');
  try {
    const resultado = fn(banco);
    banco.exec('COMMIT');
    return resultado;
  } catch (erro) {
    banco.exec('ROLLBACK');
    throw erro;
  }
}

// Fecha o banco e libera o arquivo. No Windows, o arquivo so pode ser
// apagado depois disso — usado ao final dos testes automatizados.
export function fecharBanco() {
  if (!db) return;
  try { db.close(); } catch { /* ja estava fechado */ }
  db = undefined;
}

export function parametro(chave, padrao = null) {
  const linha = um('SELECT valor FROM parametro WHERE chave = ?', chave);
  return linha ? linha.valor : padrao;
}

// ---------------------------------------------------------------------
// Copia de seguranca da base (RNFS-06)
// ---------------------------------------------------------------------
export function gerarBackup() {
  const pasta = join(PASTA_BANCO, 'backups');
  mkdirSync(pasta, { recursive: true });
  const carimbo = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  const destino = join(pasta, `marelo-${carimbo}.db`);
  abrirBanco().exec(`VACUUM INTO '${destino.replaceAll('\\', '/').replaceAll("'", "''")}'`);
  return destino;
}

export { ARQUIVO_BANCO };
