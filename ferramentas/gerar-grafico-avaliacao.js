// =====================================================================
//  Grafico da avaliacao de usabilidade por inspecao (secao 6.6)
//
//  Os resultados abaixo saem da inspecao que a equipe fez no sistema em
//  funcionamento, heuristica por heuristica, com a evidencia registrada
//  em cada linha. Nao e dado de usuario final: e avaliacao por
//  especialista, e o documento diz isso com todas as letras.
//
//  Como rodar:  node ferramentas/gerar-grafico-avaliacao.js ["pasta"]
// =====================================================================

import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.argv[2] || join(RAIZ, 'docs', 'telas');

// situacao: 'atende' | 'parcial' | 'nao'
const HEURISTICAS = [
  { n: 1,  nome: 'Visibilidade do status do sistema', situacao: 'atende',
    evidencia: 'Perfil e unidade sempre visíveis no topo; aviso de confirmação a cada gravação; contador e valor em cada etapa do funil.' },
  { n: 2,  nome: 'Correspondência com o mundo real', situacao: 'atende',
    evidencia: 'Vocabulário da loja, não do sistema: lead novo, em contato, proposta, financiamento, venda fechada, pátio, comissão.' },
  { n: 3,  nome: 'Controle e liberdade do usuário', situacao: 'parcial',
    evidencia: 'Toda janela tem Cancelar e fecha com Esc; a negociação volta de etapa. Porém não há desfazer depois de confirmada uma ação.' },
  { n: 4,  nome: 'Consistência e padrões', situacao: 'atende',
    evidencia: 'Folha de estilo única e mesmos componentes em todos os módulos; nomenclatura uniforme (RNFS-02).' },
  { n: 5,  nome: 'Prevenção de erros', situacao: 'parcial',
    evidencia: 'CPF conferido, telefone obrigatório, valor recusado se não for positivo, confirmação em ação destrutiva, venda não fecha duas vezes. Porém fechar o formulário preenchido não pede confirmação.' },
  { n: 6,  nome: 'Reconhecimento em vez de memorização', situacao: 'atende',
    evidencia: 'Listas de seleção no lugar de digitação (3 para 1 no cadastro de negociação); busca única; situação por etiqueta colorida.' },
  { n: 7,  nome: 'Flexibilidade e eficiência de uso', situacao: 'atende',
    evidencia: 'Busca global percorrível pelo teclado, arraste no funil, exportação em CSV e alternância de tema.' },
  { n: 8,  nome: 'Design estético e minimalista', situacao: 'atende',
    evidencia: 'Uma frase de contexto por tela; indicadores antes das tabelas; sem elemento decorativo concorrendo com o dado.' },
  { n: 9,  nome: 'Recuperação de erros', situacao: 'atende',
    evidencia: 'Mensagens em português, sem código técnico, dizendo o que corrigir. A inspeção encontrou 30 mensagens sem acentuação, corrigidas.' },
  { n: 10, nome: 'Ajuda e documentação', situacao: 'parcial',
    evidencia: 'Campos com texto de apoio e telas com explicação; porém não há manual acessível de dentro do sistema.' },
];

const CORES = {
  atende:  { cor: '#1E7A43', fundo: '#E5F3EA', texto: 'Atende' },
  parcial: { cor: '#B98708', fundo: '#FFF4D6', texto: 'Atende parcialmente' },
  nao:     { cor: '#B03A2E', fundo: '#FBEDEB', texto: 'Não atende' },
};

const contar = (s) => HEURISTICAS.filter((h) => h.situacao === s).length;
const total = HEURISTICAS.length;

const pagina = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#fff;font-family:"Segoe UI",system-ui,sans-serif;color:#24221D}
  #alvo{display:inline-block;padding:26px;width:980px}
  h2{font-size:17px;margin:0 0 4px}
  .sub{font-size:12.5px;color:#736D5F;margin-bottom:18px}
  .resumo{display:flex;gap:10px;margin-bottom:20px}
  .bloco{flex:1;border:1px solid #EAE7DF;border-radius:10px;padding:12px 14px}
  .bloco .num{font-size:26px;font-weight:700;line-height:1.1}
  .bloco .rot{font-size:11.5px;color:#736D5F;margin-top:2px}
  table{border-collapse:collapse;width:100%}
  th{font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#736D5F;
     text-align:left;padding:0 8px 7px;border-bottom:1px solid #EAE7DF}
  td{font-size:12px;padding:9px 8px;border-bottom:1px solid #F2F0EA;vertical-align:top}
  .h-num{font-weight:700;color:#736D5F;width:22px}
  .h-nome{font-weight:600;width:230px}
  .tag{display:inline-block;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:5px;white-space:nowrap}
  .barra{height:10px;border-radius:5px;display:flex;overflow:hidden;margin-bottom:6px}
  .leg{display:flex;gap:16px;font-size:11.5px;color:#4F4A40}
  .leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}
</style>
<div id="alvo">
  <h2>Avaliação de usabilidade por inspeção — heurísticas de Nielsen</h2>
  <p class="sub">
    Sistema de Gestão Marelo Motos · inspeção conduzida pela equipe de
    desenvolvimento sobre a aplicação em funcionamento
  </p>

  <div class="resumo">
    <div class="bloco" style="border-color:#1E7A43">
      <div class="num" style="color:#1E7A43">${contar('atende')}</div>
      <div class="rot">heurísticas atendidas</div>
    </div>
    <div class="bloco" style="border-color:#B98708">
      <div class="num" style="color:#B98708">${contar('parcial')}</div>
      <div class="rot">atendidas parcialmente</div>
    </div>
    <div class="bloco" style="border-color:#B03A2E">
      <div class="num" style="color:#B03A2E">${contar('nao')}</div>
      <div class="rot">não atendidas</div>
    </div>
    <div class="bloco">
      <div class="num">${Math.round((contar('atende') / total) * 100)}%</div>
      <div class="rot">conformidade plena</div>
    </div>
  </div>

  <div class="barra">
    <div style="background:#1E7A43;width:${(contar('atende') / total) * 100}%"></div>
    <div style="background:#FECC4D;width:${(contar('parcial') / total) * 100}%"></div>
    <div style="background:#B03A2E;width:${(contar('nao') / total) * 100}%"></div>
  </div>
  <div class="leg" style="margin-bottom:20px">
    <span><i style="background:#1E7A43"></i>Atende</span>
    <span><i style="background:#FECC4D"></i>Atende parcialmente</span>
    <span><i style="background:#B03A2E"></i>Não atende</span>
  </div>

  <table>
    <thead><tr><th></th><th>Heurística</th><th>Resultado</th><th>Evidência observada</th></tr></thead>
    <tbody>
      ${HEURISTICAS.map((h) => {
        const c = CORES[h.situacao];
        return `<tr>
          <td class="h-num">${h.n}</td>
          <td class="h-nome">${h.nome}</td>
          <td><span class="tag" style="background:${c.fundo};color:${c.cor}">${c.texto}</span></td>
          <td>${h.evidencia}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;

const NAVEGADORES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const navegador = NAVEGADORES.find((c) => existsSync(c));
if (!navegador) { console.error('  Chrome/Edge nao encontrado.'); process.exit(1); }

mkdirSync(DESTINO, { recursive: true });
const temporario = join(tmpdir(), 'grafico-avaliacao.html');
writeFileSync(temporario, pagina, 'utf8');

const browser = await puppeteer.launch({
  executablePath: navegador, headless: 'new',
  defaultViewport: { width: 1100, height: 900, deviceScaleFactor: 2 },
});
const aba = await browser.newPage();
await aba.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await aba.goto(`file:///${temporario.replaceAll('\\', '/')}`, { waitUntil: 'networkidle0' });
const destino = join(DESTINO, '28-avaliacao-heuristica.png');
await (await aba.$('#alvo')).screenshot({ path: destino });
await browser.close();

console.log('');
console.log(`  ${destino}`);
console.log(`  ${contar('atende')} atende · ${contar('parcial')} parcial · ${contar('nao')} nao atende`);
console.log('');
