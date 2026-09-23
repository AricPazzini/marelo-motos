// =====================================================================
//  Camada de banco — versao NAVEGADOR (GitHub Pages)
//
//  Este arquivo tem exatamente as mesmas funcoes de servidor/banco.js,
//  mas por baixo usa o SQLite compilado para WebAssembly (sql.js), que
//  roda dentro do navegador. Por causa disso, os arquivos
//  api.js, auth.js e regras.js sao aproveitados SEM NENHUMA ALTERACAO:
//  eles pedem "./banco.js" e recebem este aqui.
//
//  O banco vive na memoria da aba e e montado do zero a partir dos
//  mesmos schema.sql e seed.sql do projeto. Fechou a aba, os dados
//  voltam ao estado inicial — e isso e proposital numa demonstracao
//  publica: cada visitante comeca do mesmo lugar.
// =====================================================================

import { SCHEMA_SQL, SEED_SQL } from './sql-embutido.js';

export const SENHA_PADRAO = 'marelo123';

let db;

// ---------------------------------------------------------------------
// SHA-256 em JavaScript puro.
//
// No servidor as senhas usam scrypt (node:crypto). Aqui nao da para
// usar o mesmo: o scrypt nao existe no navegador e a criptografia
// nativa (crypto.subtle) so funciona de forma assincrona, o que
// mudaria a assinatura de conferirSenha() e quebraria o auth.js.
// Entao usamos SHA-256 sobre "salto + senha": a mecanica e a mesma
// (nenhuma senha fica em texto puro no banco) com codigo sincrono.
// ---------------------------------------------------------------------
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256(texto) {
  const bytes = new TextEncoder().encode(texto);
  const tamanhoBits = bytes.length * 8;
  const total = (((bytes.length + 8) >> 6) + 1) * 64;
  const bloco = new Uint8Array(total);
  bloco.set(bytes);
  bloco[bytes.length] = 0x80;
  new DataView(bloco.buffer).setUint32(total - 4, tamanhoBits, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const gira = (x, n) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < total; i += 64) {
    const visao = new DataView(bloco.buffer, i, 64);
    for (let t = 0; t < 16; t++) w[t] = visao.getUint32(t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = gira(w[t - 15], 7) ^ gira(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = gira(w[t - 2], 17) ^ gira(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = gira(e, 6) ^ gira(e, 11) ^ gira(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = gira(a, 2) ^ gira(a, 13) ^ gira(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return [...h].map((x) => x.toString(16).padStart(8, '0')).join('');
}

function sortear(bytes) {
  const valores = new Uint8Array(bytes);
  crypto.getRandomValues(valores);
  return [...valores].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Mesmas assinaturas de servidor/banco.js
export function gerarHash(senha) {
  const salto = sortear(16);
  return `${salto}:${sha256(salto + senha)}`;
}

export function gerarToken() {
  return sortear(24);
}

export function conferirSenha(senha, armazenado) {
  if (!armazenado || !armazenado.includes(':')) return false;
  const [salto, hash] = armazenado.split(':');
  return sha256(salto + senha) === hash;
}

// ---------------------------------------------------------------------
// Abertura do banco
// ---------------------------------------------------------------------
export async function prepararBanco() {
  if (db) return db;

  const SQL = await globalThis.initSqlJs({
    locateFile: (arquivo) => new URL(arquivo, import.meta.url).href,
  });

  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);
  db.run(SEED_SQL);

  // O seed grava 'DEFINIR'; aqui vira hash de verdade.
  const pendentes = todos("SELECT id FROM usuario WHERE senha_hash = 'DEFINIR'");
  for (const u of pendentes) {
    executar('UPDATE usuario SET senha_hash = ? WHERE id = ?', gerarHash(SENHA_PADRAO), u.id);
  }

  return db;
}

export function abrirBanco() {
  if (!db) throw new Error('O banco ainda nao foi carregado.');
  return envolver();
}

// ---------------------------------------------------------------------
// Consultas — mesma interface de servidor/banco.js
// ---------------------------------------------------------------------
const normalizar = (params) =>
  params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p));

export function todos(sql, ...params) {
  const consulta = db.prepare(sql);
  try {
    consulta.bind(normalizar(params));
    const linhas = [];
    while (consulta.step()) linhas.push(consulta.getAsObject());
    return linhas;
  } finally {
    consulta.free();
  }
}

export function um(sql, ...params) {
  return todos(sql, ...params)[0];
}

export function executar(sql, ...params) {
  db.run(sql, normalizar(params));
  const [linha] = db.exec('SELECT last_insert_rowid() AS id, changes() AS mudou');
  return {
    lastInsertRowid: linha ? linha.values[0][0] : 0,
    changes: linha ? linha.values[0][1] : 0,
  };
}

// Objeto com a mesma cara do banco do Node, para que o fecharVenda()
// funcione sem alteracao (ele usa banco.prepare(...).run/get).
function envolver() {
  return {
    prepare(sql) {
      return {
        run: (...p) => executar(sql, ...p),
        get: (...p) => um(sql, ...p),
        all: (...p) => todos(sql, ...p),
      };
    },
    exec: (sql) => db.run(sql),
  };
}

export function emTransacao(fn) {
  db.run('BEGIN');
  try {
    const resultado = fn(envolver());
    db.run('COMMIT');
    return resultado;
  } catch (erro) {
    db.run('ROLLBACK');
    throw erro;
  }
}

export function parametro(chave, padrao = null) {
  const linha = um('SELECT valor FROM parametro WHERE chave = ?', chave);
  return linha ? linha.valor : padrao;
}

// Na demonstracao publica a copia de seguranca vira o download do
// arquivo .db, que abre em qualquer visualizador de SQLite.
export function gerarBackup() {
  const dados = db.export();
  const url = URL.createObjectURL(new Blob([dados], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `marelo-${new Date().toISOString().slice(0, 10)}.db`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'baixado para o seu computador (marelo-....db)';
}

export function fecharBanco() {
  if (db) { db.close(); db = undefined; }
}

export const ARQUIVO_BANCO = '(memoria do navegador)';
