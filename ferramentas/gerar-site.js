// =====================================================================
//  Gera a versao do sistema para o GitHub Pages
//
//  O GitHub Pages so entrega arquivos parados — nao roda servidor nem
//  banco. Este script monta uma pasta "site/" onde o MESMO sistema
//  funciona inteiro dentro do navegador:
//
//    - o banco vira SQLite compilado para WebAssembly (sql.js)
//    - schema.sql e seed.sql viram texto embutido em um .js
//    - api.js, auth.js e regras.js sao COPIADOS do servidor, sem
//      alteracao: eles pedem "./banco.js" e recebem o adaptador web
//
//  Como rodar:  node ferramentas/gerar-site.js
//               (ou o atalho PUBLICAR-SITE.bat, que ja envia ao GitHub)
// =====================================================================

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const SITE = join(RAIZ, 'site');
const DADOS = join(SITE, 'js', 'dados');

console.log('');
console.log('  Gerando a versao para o GitHub Pages...');
console.log('');

// 1. pasta limpa -------------------------------------------------------
if (existsSync(SITE)) rmSync(SITE, { recursive: true, force: true });
mkdirSync(DADOS, { recursive: true });

// 2. as telas ----------------------------------------------------------
cpSync(join(RAIZ, 'publico'), SITE, { recursive: true });
console.log('  telas copiadas');

// 3. o codigo do servidor, sem alteracao -------------------------------
for (const arquivo of ['api.js', 'auth.js', 'regras.js']) {
  cpSync(join(RAIZ, 'servidor', arquivo), join(DADOS, arquivo));
}
console.log('  api.js, auth.js e regras.js aproveitados do servidor');

// 4. o adaptador do banco e o "servidor" local -------------------------
for (const arquivo of ['banco.js', 'local.js']) {
  cpSync(join(AQUI, 'web', arquivo), join(DADOS, arquivo));
}

// 5. o SQLite em WebAssembly -------------------------------------------
for (const arquivo of ['sql-wasm.js', 'sql-wasm.wasm']) {
  cpSync(join(AQUI, 'vendor', arquivo), join(DADOS, arquivo));
}
console.log('  SQLite (WebAssembly) embarcado');

// 6. schema.sql e seed.sql viram texto ---------------------------------
const comoTexto = (nome) =>
  JSON.stringify(readFileSync(join(RAIZ, 'banco', nome), 'utf8'));

writeFileSync(join(DADOS, 'sql-embutido.js'), `// Gerado por ferramentas/gerar-site.js — nao editar a mao.
// Conteudo identico a banco/schema.sql e banco/seed.sql.
export const SCHEMA_SQL = ${comoTexto('schema.sql')};
export const SEED_SQL = ${comoTexto('seed.sql')};
`);
console.log('  schema.sql e seed.sql embutidos');

// 7. os HTMLs passam a carregar o banco do navegador -------------------
const PARTIDA = `
<!-- Versao GitHub Pages: sobe o banco SQLite dentro do navegador -->
<script src="./js/dados/sql-wasm.js"></script>
<script type="module">
  import './js/dados/local.js';
  await globalThis.MARELO_LOCAL.iniciar();
  const email = sessionStorage.getItem('marelo_email');
  if (email) globalThis.MARELO_LOCAL.restaurarSessao(email);
  document.dispatchEvent(new Event('marelo-pronto'));
</script>`;

// login
let login = readFileSync(join(SITE, 'index.html'), 'utf8');
login = login.replace('</head>', `${PARTIDA}\n</head>`);
login = login.replace(
  '<p class="dica" style="margin-top:20px',
  `<div class="aviso info" style="margin-top:22px;text-align:left">
      <b>Versão de demonstração.</b> O sistema roda inteiro no seu navegador,
      com um banco SQLite de verdade montado na hora. Pode cadastrar, fechar
      vendas e mexer à vontade: ao recarregar a página tudo volta ao estado
      inicial, e nada é enviado para lugar nenhum.
    </div>
    <p class="dica" style="margin-top:20px`);
writeFileSync(join(SITE, 'index.html'), login);

// sistema — o app.js so entra depois que o banco estiver pronto
let app = readFileSync(join(SITE, 'app.html'), 'utf8');
app = app.replace('<script type="module" src="./js/app.js"></script>', `
<script src="./js/dados/sql-wasm.js"></script>
<script type="module">
  import './js/dados/local.js';
  await globalThis.MARELO_LOCAL.iniciar();
  const email = sessionStorage.getItem('marelo_email');
  if (email) globalThis.MARELO_LOCAL.restaurarSessao(email);
  await import('./js/app.js');
</script>`);
app = app.replace(
  '<span id="rodape-banco">Dados fictícios, a confirmar na visita à loja</span>',
  '<span id="rodape-banco">Demonstração — banco SQLite rodando no seu navegador</span>');
writeFileSync(join(SITE, 'app.html'), app);
console.log('  paginas ajustadas');

// 8. o GitHub Pages nao deve processar a pasta com Jekyll --------------
writeFileSync(join(SITE, '.nojekyll'), '');

console.log('');
console.log(`  Pronto: ${SITE}`);
console.log('  Para conferir antes de publicar, abra a pasta com um servidor local.');
console.log('');
