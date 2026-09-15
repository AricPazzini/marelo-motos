// =====================================================================
//  Captura as telas do sistema em PNG, para as figuras da documentacao
//
//  Sobe o Chrome que ja existe no Windows em modo invisivel, entra no
//  sistema, passa por cada tela e salva um arquivo. Refazer os prints
//  depois de qualquer mudanca vira um comando so — nada de recortar
//  tela a tela na mao.
//
//  Antes de rodar, o sistema precisa estar no ar (INICIAR.bat).
//
//  Como rodar:  node ferramentas/capturar-telas.js
//               node ferramentas/capturar-telas.js "C:\\outra\\pasta"
// =====================================================================

import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.argv[2] || join(RAIZ, 'docs', 'telas');
const ENDERECO = process.env.MARELO_URL || 'http://localhost:7820';

const NAVEGADORES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

// Cada item vira uma figura da secao 6.2 da documentacao
const TELAS = [
  { arquivo: '01-login',            entrar: null,          hash: null,                  titulo: 'Tela de entrada' },
  { arquivo: '02-painel-dono',      entrar: 'dono',        hash: 'painel',              titulo: 'Area do Dono' },
  { arquivo: '03-comercial-funil',  entrar: 'dono',        hash: 'comercial/funil',     titulo: 'Funil de vendas' },
  { arquivo: '04-comercial-clientes', entrar: 'dono',      hash: 'comercial/clientes',  titulo: 'Cadastro de clientes' },
  { arquivo: '05-comercial-sac',    entrar: 'dono',        hash: 'comercial/sac',       titulo: 'SAC - pos-venda' },
  { arquivo: '06-estoque',          entrar: 'dono',        hash: 'estoque/patio',       titulo: 'Estoque - patio' },
  { arquivo: '07-financeiro-resumo', entrar: 'dono',       hash: 'financeiro/resumo',   titulo: 'Financeiro - resumo' },
  { arquivo: '08-financeiro-contratos', entrar: 'dono',    hash: 'financeiro/contratos', titulo: 'Contratos e parcelas' },
  { arquivo: '09-financeiro-cobranca', entrar: 'dono',     hash: 'financeiro/cobranca', titulo: 'Regua de cobranca' },
  { arquivo: '09b-financeiro-despesas', entrar: 'dono', hash: 'financeiro/despesas', titulo: 'Despesas fixas da loja' },
  { arquivo: '09c-busca-global',       entrar: 'dono', hash: 'painel',               titulo: 'Busca global', busca: 'Carlos' },
  { arquivo: '10-rh-equipe',        entrar: 'dono',        hash: 'rh/equipe',           titulo: 'RH - equipe' },
  { arquivo: '11-rh-folha',         entrar: 'dono',        hash: 'rh/folha',            titulo: 'Folha e comissoes' },
  { arquivo: '12-rh-ferias',        entrar: 'dono',        hash: 'rh/ferias',           titulo: 'Controle de ferias' },
  { arquivo: '13-ajustes',          entrar: 'dono',        hash: 'ajustes/parametros',  titulo: 'Parametros da loja' },
  { arquivo: '14-ajustes-backup',   entrar: 'dono',        hash: 'ajustes/sistema',     titulo: 'Sistema e backup' },
  { arquivo: '15-meu-painel',       entrar: 'vendedor',    hash: 'meu-painel',          titulo: 'Painel do vendedor' },
  { arquivo: '16-vendedor-comercial', entrar: 'vendedor',  hash: 'comercial/funil',     titulo: 'Funil visto pelo vendedor' },
  { arquivo: '17-vendedor-estoque', entrar: 'vendedor',    hash: 'estoque/patio',       titulo: 'Estoque so de consulta' },
  { arquivo: '18-financeiro-setor', entrar: 'financeiro',  hash: 'financeiro/cobranca', titulo: 'Cobranca pelo setor financeiro' },
];

const CONTAS = {
  dono:       'marcelo@marelomotos.com.br',
  vendedor:   'rodrigo@marelomotos.com.br',
  financeiro: 'claudia@marelomotos.com.br',
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = NAVEGADORES.find((c) => existsSync(c));
if (!navegador) {
  console.error('  Nao encontrei o Chrome nem o Edge neste computador.');
  process.exit(1);
}

mkdirSync(DESTINO, { recursive: true });

console.log('');
console.log('  Capturando as telas do sistema...');
console.log(`  Sistema:  ${ENDERECO}`);
console.log(`  Salvando: ${DESTINO}`);
console.log('');

const browser = await puppeteer.launch({
  executablePath: navegador,
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  args: ['--hide-scrollbars', '--force-device-scale-factor=2'],
});

const pagina = await browser.newPage();
let perfilAtual = null;

async function entrarComo(perfil) {
  if (perfilAtual === perfil) return;
  await pagina.goto(`${ENDERECO}/index.html`, { waitUntil: 'networkidle0' });
  await pagina.type('#email', CONTAS[perfil]);
  await pagina.type('#senha', 'marelo123');
  await Promise.all([
    pagina.waitForNavigation({ waitUntil: 'networkidle0' }),
    pagina.click('#botao'),
  ]);
  perfilAtual = perfil;
}

try {
  for (const tela of TELAS) {
    if (tela.entrar === null) {
      await pagina.goto(`${ENDERECO}/index.html`, { waitUntil: 'networkidle0' });
      perfilAtual = null;
    } else {
      await entrarComo(tela.entrar);
      await pagina.evaluate((h) => { window.location.hash = h; }, tela.hash);
      await esperar(700); // deixa a tela terminar de montar
      if (tela.busca) {
        await pagina.type('#busca-global', tela.busca);
        await esperar(900); // espera a consulta voltar
      }
    }

    const caminho = join(DESTINO, `${tela.arquivo}.png`);
    await pagina.screenshot({ path: caminho, fullPage: true });
    console.log(`  ${tela.arquivo.padEnd(24)} ${tela.titulo}`);

    // Limpa a busca, senao o texto e o painel de resultados sobram nas
    // telas seguintes e aparecem em figuras onde nao deveriam.
    if (tela.busca) {
      await pagina.evaluate(() => {
        const campo = document.getElementById('busca-global');
        if (campo) { campo.value = ''; campo.dispatchEvent(new Event('input', { bubbles: true })); }
        document.body.click();
      });
      await esperar(300);
    }
  }
} finally {
  await browser.close();
}

console.log('');
console.log(`  ${TELAS.length} telas salvas em ${DESTINO}`);
console.log('');
