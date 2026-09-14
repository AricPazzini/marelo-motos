// =====================================================================
//  Gera as figuras de codigo, o fluxograma e a prova das permissoes
//
//  Os trechos sao recortados dos arquivos reais do projeto — nada e
//  digitado a mao, entao a figura nunca fica diferente do codigo.
//
//  Como rodar (com o sistema no ar):
//      node ferramentas/gerar-figuras-codigo.js ["pasta de destino"]
// =====================================================================

import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.argv[2] || join(RAIZ, 'docs', 'telas');
const ENDERECO = process.env.MARELO_URL || 'http://localhost:7820';

// Recorta as linhas de um arquivo do projeto (base 1, inclusivo)
function trecho(arquivo, de, ate) {
  return readFileSync(join(RAIZ, arquivo), 'utf8')
    .split(/\r?\n/).slice(de - 1, ate).join('\n');
}

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Realce simples, suficiente para leitura em papel
function realcar(codigo, linguagem) {
  let t = escapar(codigo);
  const marca = (re, cor) => { t = t.replace(re, (m) => `\u0001${cor}\u0002${m}\u0003`); };

  if (linguagem === 'sql') {
    marca(/--[^\n]*/g, 'com');
    marca(/\b(CREATE|TABLE|IF|NOT|EXISTS|INTEGER|PRIMARY|KEY|AUTOINCREMENT|TEXT|REAL|NULL|DEFAULT|UNIQUE|CHECK|IN|REFERENCES|VIEW|AS|SELECT|FROM|WHERE|JOIN|ON|CASE|WHEN|THEN|ELSE|END|AND|OR)\b/g, 'pal');
  } else if (linguagem === 'html') {
    marca(/&lt;!--[\s\S]*?--&gt;/g, 'com');
    marca(/&lt;\/?[a-zA-Z][\w-]*/g, 'tag');
    marca(/[a-zA-Z-]+(?==&quot;)/g, 'atr');
  } else if (linguagem === 'css') {
    marca(/\/\*[\s\S]*?\*\//g, 'com');
    marca(/--[\w-]+(?=\s*:)/g, 'atr');
  } else {
    marca(/\/\/[^\n]*/g, 'com');
    marca(/\b(import|from|export|const|let|function|async|await|return|if|else|for|of|try|catch|throw|new|class)\b/g, 'pal');
    marca(/'[^'\n]*'/g, 'txt');
  }

  return t
    .replace(/\u0001(\w+)\u0002/g, '<span class="$1">')
    .replace(/\u0003/g, '</span>');
}

function paginaCodigo(titulo, codigo, linguagem, primeiraLinha) {
  const linhas = codigo.split('\n');
  const numeros = linhas.map((_, i) => primeiraLinha + i).join('\n');
  return `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#fff;font-family:"Segoe UI",system-ui,sans-serif}
  .quadro{display:inline-block;border:1px solid #D8D4CA;border-radius:10px;overflow:hidden;min-width:900px}
  .barra{background:#FECC4D;color:#3B3320;font-size:15px;font-weight:600;padding:10px 16px}
  .corpo{display:flex;background:#FCFBF8}
  pre{margin:0;font-family:Consolas,"Courier New",monospace;font-size:14.5px;line-height:1.65}
  .num{color:#A9A296;text-align:right;padding:14px 10px 14px 16px;background:#F4F1EA;border-right:1px solid #E6E2D8;user-select:none}
  .cod{padding:14px 18px;color:#24221D;white-space:pre}
  .com{color:#7E8B72;font-style:italic}
  .pal{color:#8A5A00;font-weight:600}
  .tag{color:#2F5B87;font-weight:600}
  .atr{color:#9A3E8F}
  .txt{color:#1E7A43}
</style>
<div class="quadro" id="alvo">
  <div class="barra">${titulo}</div>
  <div class="corpo"><pre class="num">${numeros}</pre><pre class="cod">${realcar(codigo, linguagem)}</pre></div>
</div>`;
}

// ---------------------------------------------------------------------
const FLUXOGRAMA = `flowchart TD
  A([Inicio]) --> B[Definir a empresa e a area de estudo]
  B --> C[Levantar os problemas junto ao cliente]
  C --> D[Analisar aplicacoes similares]
  D --> E[Especificar requisitos funcionais e nao funcionais]
  E --> F[Modelar o banco de dados: conceitual e logico]
  F --> G[Implementar o banco em SQL]
  G --> H[Desenvolver as telas em HTML, CSS e JavaScript]
  H --> I[Implementar as regras de negocio e o controle de acesso]
  I --> J[Testar automaticamente as regras criticas]
  J --> K{Testes aprovados?}
  K -- Nao --> I
  K -- Sim --> L[Publicar no GitHub e no GitHub Pages]
  L --> M[Validar com os usuarios finais]
  M --> N{Ajustes necessarios?}
  N -- Sim --> H
  N -- Nao --> O([Entrega])`;

const NAVEGADORES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const navegador = NAVEGADORES.find((c) => existsSync(c));
if (!navegador) { console.error('  Chrome/Edge nao encontrado.'); process.exit(1); }

mkdirSync(DESTINO, { recursive: true });

// --- prova real da checagem de permissao ------------------------------
async function provaDePermissao() {
  const entrar = await fetch(`${ENDERECO}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rodrigo@marelomotos.com.br', senha: 'marelo123' }),
  });
  const cookie = entrar.headers.getSetCookie?.()[0]?.split(';')[0] || '';
  const bloqueado = await fetch(`${ENDERECO}/api/painel`, { headers: { cookie } });
  const corpo = await bloqueado.json();
  return { status: bloqueado.status, corpo };
}

const browser = await puppeteer.launch({
  executablePath: navegador,
  headless: 'new',
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
});

async function capturar(arquivo, html, seletor = '#alvo') {
  const temporario = join(tmpdir(), `${arquivo}.html`);
  writeFileSync(temporario, html, 'utf8');
  const aba = await browser.newPage();
  await aba.goto(`file:///${temporario.replaceAll('\\', '/')}`, { waitUntil: 'networkidle0' });
  await aba.waitForSelector(seletor, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 400));
  await (await aba.$(seletor)).screenshot({ path: join(DESTINO, `${arquivo}.png`) });
  await aba.close();
  console.log(`  ${arquivo}`);
}

console.log('');

await capturar('21-codigo-html',
  paginaCodigo('publico/index.html — estrutura do formulário de entrada',
    trecho('publico/index.html', 17, 31), 'html', 17));

await capturar('22-codigo-css',
  paginaCodigo('publico/css/estilo.css — variáveis da identidade visual',
    trecho('publico/css/estilo.css', 1, 22), 'css', 1));

await capturar('23-codigo-javascript',
  paginaCodigo('publico/js/nucleo.js — chamada à interface de programação',
    trecho('publico/js/nucleo.js', 14, 40), 'js', 14));

await capturar('24-codigo-sql',
  paginaCodigo('banco/schema.sql — definição da tabela de motocicletas',
    trecho('banco/schema.sql', 80, 101), 'sql', 80));

// fluxograma
await capturar('25-fluxograma', `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#fff}#alvo{display:inline-block;padding:26px}</style>
<div id="alvo" class="mermaid">${FLUXOGRAMA}</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{
  primaryColor:'#FFF4D6',primaryBorderColor:'#B98708',primaryTextColor:'#24221D',
  lineColor:'#5C574C',fontFamily:'Segoe UI, system-ui, sans-serif',fontSize:'15px'},
  flowchart:{useMaxWidth:false}});</script>`, '#alvo');

// permissao negada, com a resposta real do servidor
const prova = await provaDePermissao();
await capturar('26-permissoes', `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#fff;font-family:"Segoe UI",system-ui,sans-serif}
  #alvo{display:inline-block;border:1px solid #D8D4CA;border-radius:10px;overflow:hidden;min-width:860px}
  .barra{background:#FECC4D;color:#3B3320;font-size:15px;font-weight:600;padding:10px 16px}
  .corpo{padding:18px 20px;background:#FCFBF8;font-family:Consolas,"Courier New",monospace;font-size:14.5px;line-height:1.8;color:#24221D}
  .rot{color:#938D7E}
  .erro{color:#B03A2E;font-weight:700}
  .ok{color:#1E7A43;font-weight:700}
</style>
<div id="alvo">
  <div class="barra">Verificação de permissão no servidor — perfil Vendedor</div>
  <div class="corpo">
    <span class="rot">1. Entrada no sistema</span><br>
    POST /api/login  →  <span class="ok">200 OK</span>  (Rodrigo Alves, perfil Funcionário, setor comercial)<br><br>
    <span class="rot">2. Tentativa de acesso ao painel gerencial</span><br>
    GET /api/painel  →  <span class="erro">${prova.status} ${prova.status === 403 ? 'Forbidden' : ''}</span><br><br>
    <span class="rot">3. Resposta devolvida pelo servidor</span><br>
    ${escapar(JSON.stringify(prova.corpo, null, 2)).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}
  </div>
</div>`);

await browser.close();
console.log('');
console.log(`  Figuras salvas em ${DESTINO}`);
console.log('');
