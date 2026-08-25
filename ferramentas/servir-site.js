// =====================================================================
//  Servidor estatico so para CONFERIR a pasta site/ antes de publicar.
//
//  Entrega os arquivos do mesmo jeito que o GitHub Pages faria: sem
//  nenhuma API por tras. Se funcionar aqui, funciona la.
//
//  Como rodar:  node ferramentas/servir-site.js   ->  http://localhost:7821
// =====================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORTA = Number(process.env.PORT) || 7821;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  let caminho = decodeURIComponent(req.url.split('?')[0]);
  if (caminho === '/') caminho = '/index.html';

  const destino = join(SITE, normalize(caminho).replace(/^(\.\.[/\\])+/, ''));
  if (!destino.startsWith(SITE)) {
    res.writeHead(403).end('Acesso negado');
    return;
  }

  try {
    const info = await stat(destino);
    if (!info.isFile()) throw new Error('nao e arquivo');
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(await readFile(destino));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Arquivo nao encontrado nesta pasta.</p>');
  }
}).listen(PORTA, () => {
  console.log('');
  console.log(`  Conferindo a versao do GitHub Pages: http://localhost:${PORTA}`);
  console.log(`  Pasta servida: ${SITE}`);
  console.log('');
});
