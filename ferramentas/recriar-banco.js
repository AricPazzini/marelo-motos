// =====================================================================
//  Recria o banco do zero.
//
//  Apaga o arquivo atual e aplica schema.sql + seed.sql novamente.
//  Use quando quiser voltar o prototipo ao estado inicial de teste.
//
//  Como rodar:  node ferramentas/recriar-banco.js
//               (ou o atalho RECRIAR-BANCO.bat)
//
//  IMPORTANTE: o SQLite mantem os arquivos .db-wal e .db-shm ao lado do
//  banco. Apagar apenas o .db deixa o sistema lendo dados velhos, por
//  isso os tres sao removidos juntos.
// =====================================================================

import { existsSync, rmSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_BANCO = join(AQUI, '..', 'banco');
const BANCO = join(PASTA_BANCO, 'marelo.db');

// Antes de apagar, guarda uma copia do banco atual — nunca se perde
// o que ja foi digitado durante os testes.
if (existsSync(BANCO)) {
  const pastaAntigos = join(PASTA_BANCO, 'anteriores');
  mkdirSync(pastaAntigos, { recursive: true });
  const carimbo = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  const destino = join(pastaAntigos, `marelo-${carimbo}.db`);

  try {
    renameSync(BANCO, destino);
    console.log(`  Banco anterior guardado em: ${destino}`);
  } catch (erro) {
    if (erro.code === 'EBUSY' || erro.code === 'EPERM') {
      console.error('');
      console.error('  NAO FOI POSSIVEL RECRIAR O BANCO');
      console.error('');
      console.error('  O sistema esta aberto e usando o arquivo do banco.');
      console.error('  Feche a janela preta do servidor (ou tecle Ctrl + C nela)');
      console.error('  e rode este atalho de novo.');
      console.error('');
      process.exit(1);
    }
    throw erro;
  }
}

for (const extra of ['-wal', '-shm']) {
  const arquivo = BANCO + extra;
  if (existsSync(arquivo)) {
    rmSync(arquivo);
    console.log(`  Removido: ${arquivo}`);
  }
}

const { abrirBanco } = await import('../servidor/banco.js');
abrirBanco();
console.log('  Banco recriado com os dados de teste.');
