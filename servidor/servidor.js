// =====================================================================
//  MARELO MOTOS - Servidor
//
//  Sobe o sistema em http://localhost:7820
//  Sem nenhuma biblioteca externa: so o que ja vem no Node.
// =====================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { abrirBanco, ARQUIVO_BANCO } from './banco.js';
import {
  encontrarRota, pode, usuarioDaSessao,
} from './api.js';
import { lerTokenDoCookie } from './auth.js';
import { ErroDeRegra } from './regras.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_PUBLICA = join(AQUI, '..', 'publico');
const PORTA = Number(process.env.PORT) || 7820;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function responder(res, status, dados, cabecalhos = {}) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...cabecalhos,
  });
  res.end(corpo);
}

async function lerCorpo(req) {
  if (req.method === 'GET' || req.method === 'DELETE') return {};
  const partes = [];
  for await (const parte of req) partes.push(parte);
  if (partes.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8'));
  } catch {
    throw new ErroDeRegra('Os dados enviados nao estao em um formato valido.');
  }
}

// ---------------------------------------------------------------------
// Arquivos das telas
// ---------------------------------------------------------------------
async function servirArquivo(res, caminhoUrl) {
  let relativo = decodeURIComponent(caminhoUrl.split('?')[0]);
  if (relativo === '/') relativo = '/index.html';

  // impede sair da pasta publica
  const destino = join(PASTA_PUBLICA, normalize(relativo).replace(/^(\.\.[/\\])+/, ''));
  if (!destino.startsWith(PASTA_PUBLICA)) {
    res.writeHead(403).end('Acesso negado');
    return;
  }

  try {
    const informacao = await stat(destino);
    if (!informacao.isFile()) throw new Error('nao e arquivo');
    const conteudo = await readFile(destino);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Pagina nao encontrada. <a href="/">Voltar ao inicio</a></p>');
  }
}

// ---------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const caminho = url.pathname;

  if (!caminho.startsWith('/api/')) {
    return servirArquivo(res, req.url);
  }

  try {
    const alvo = encontrarRota(req.method, caminho);
    if (!alvo) return responder(res, 404, { erro: 'Recurso nao encontrado.' });

    const token = lerTokenDoCookie(req.headers.cookie);
    const usuario = usuarioDaSessao(token);

    // rotas com permissao null sao publicas (apenas o login)
    if (alvo.permissao !== null) {
      if (!usuario) {
        return responder(res, 401, { erro: 'Sessao encerrada. Entre novamente.' });
      }
      if (alvo.permissao !== 'livre' && !pode(usuario, alvo.permissao)) {
        return responder(res, 403, {
          erro: 'Seu perfil de acesso nao permite esta operacao.',
          permissaoExigida: alvo.permissao,
        });
      }
    }

    const corpo = await lerCorpo(req);
    const query = Object.fromEntries(url.searchParams);
    const resultado = alvo.manipulador({
      params: alvo.params, corpo, query, usuario, token, req,
    });

    // o login devolve o token: vira cookie de sessao
    if (caminho === '/api/login' && resultado?.token) {
      return responder(res, 200, resultado, {
        'Set-Cookie': `marelo_sessao=${resultado.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
      });
    }
    if (caminho === '/api/sair') {
      return responder(res, 200, resultado, {
        'Set-Cookie': 'marelo_sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
      });
    }

    return responder(res, 200, resultado ?? { ok: true });
  } catch (erro) {
    if (erro instanceof ErroDeRegra) {
      return responder(res, erro.status || 400, { erro: erro.message });
    }
    // erro de restricao do banco vira mensagem legivel
    const texto = String(erro?.message || erro);
    if (texto.includes('UNIQUE constraint')) {
      return responder(res, 400, { erro: 'Ja existe um registro com este dado unico.' });
    }
    if (texto.includes('FOREIGN KEY')) {
      return responder(res, 400, { erro: 'Registro vinculado a outro cadastro.' });
    }
    console.error('[erro]', erro);
    return responder(res, 500, { erro: 'Erro interno do sistema. Verifique o terminal.' });
  }
});

abrirBanco();

servidor.listen(PORTA, () => {
  console.log('');
  console.log('  ===================================================');
  console.log('   MARELO MOTOS - Sistema de Gestao (prototipo)');
  console.log('  ===================================================');
  console.log('');
  console.log(`   Abra no navegador:  http://localhost:${PORTA}`);
  console.log(`   Banco de dados:     ${ARQUIVO_BANCO}`);
  console.log('');
  console.log('   Usuarios de teste (senha: marelo123)');
  console.log('     marcelo@marelomotos.com.br   - Dono');
  console.log('     rodrigo@marelomotos.com.br   - Vendedor');
  console.log('     claudia@marelomotos.com.br   - Financeiro');
  console.log('');
  console.log('   Para encerrar: feche esta janela ou tecle Ctrl + C');
  console.log('');
});
