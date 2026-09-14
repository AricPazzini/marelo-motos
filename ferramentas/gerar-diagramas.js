// =====================================================================
//  Gera as figuras do modelo de dados para a documentacao
//
//  Desenha dois diagramas a partir do banco real:
//    - Modelo Conceitual: as entidades do negocio e como se ligam
//    - Modelo Logico: as tabelas, colunas, chaves primarias e estrangeiras
//
//  Como rodar:  node ferramentas/gerar-diagramas.js ["pasta de destino"]
// =====================================================================

import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.argv[2] || join(RAIZ, 'docs', 'telas');

const CONCEITUAL = `erDiagram
  FUNCIONARIO ||--o{ FERIAS : "programa"
  FUNCIONARIO ||--o| USUARIO : "acessa o sistema por"
  FUNCIONARIO ||--o{ CLIENTE : "atende na carteira"
  FUNCIONARIO ||--o{ NEGOCIACAO : "conduz"
  FUNCIONARIO ||--o{ CONTRATO : "vende"
  CLIENTE ||--o{ NEGOCIACAO : "participa de"
  CLIENTE ||--o{ CONTRATO : "assina"
  CLIENTE ||--o{ CHAMADO : "abre"
  MOTOCICLETA ||--o{ NEGOCIACAO : "e o interesse de"
  MOTOCICLETA ||--o| CONTRATO : "e vendida em"
  MOTOCICLETA ||--o{ CHAMADO : "motiva"
  NEGOCIACAO ||--o{ HISTORICO : "registra mudanca de etapa"
  NEGOCIACAO ||--o| CONTRATO : "se torna"
  CONTRATO ||--|{ PARCELA : "gera"
  PARCELA ||--o{ COBRANCA : "aciona"

  FUNCIONARIO {
      string nome
      string cargo
      string setor
      real percentual_comissao
    }
    USUARIO {
      string email
      string perfil
    }
    CLIENTE {
      string nome
      string cpf
      string telefone
      string origem
    }
    MOTOCICLETA {
      string codigo
      string modelo
      integer ano
      real preco_venda
      date data_entrada
    }
    NEGOCIACAO {
      string etapa
      real valor_negociado
    }
    CONTRATO {
      string numero
      string forma_pagamento
      real valor_total
    }
    PARCELA {
      integer numero
      date vencimento
      real valor
      string situacao
    }
    COBRANCA {
      string acao
      date momento
    }
    CHAMADO {
      string assunto
      string situacao
    }
    FERIAS {
      date data_inicio
      date data_fim
    }
    HISTORICO {
      string etapa_de
      string etapa_para
      date momento
    }`;

const LOGICO = `erDiagram
  funcionario ||--o{ ferias : funcionario_id
  funcionario ||--o{ usuario : funcionario_id
  funcionario ||--o{ cliente : vendedor_id
  funcionario ||--o{ negociacao : vendedor_id
  funcionario ||--o{ contrato : vendedor_id
  funcionario ||--o{ chamado : responsavel_id
  usuario ||--o{ log_acesso : usuario_id
  cliente ||--o{ negociacao : cliente_id
  cliente ||--o{ contrato : cliente_id
  cliente ||--o{ chamado : cliente_id
  moto ||--o{ negociacao : moto_id
  moto ||--o{ contrato : moto_id
  moto ||--o{ chamado : moto_id
  negociacao ||--o{ negociacao_historico : negociacao_id
  negociacao ||--o| contrato : negociacao_id
  contrato ||--|{ parcela : contrato_id
  parcela ||--o{ cobranca : parcela_id

  funcionario {
    INTEGER id PK
    TEXT nome
    TEXT cpf UK
    TEXT cargo
    TEXT setor
    TEXT data_admissao
    TEXT data_desligamento
    REAL salario
    REAL percentual_comissao
    INTEGER meta_mensal
    TEXT situacao
  }
  usuario {
    INTEGER id PK
    TEXT email UK
    TEXT senha_hash
    TEXT perfil
    INTEGER funcionario_id FK
    INTEGER ativo
  }
  log_acesso {
    INTEGER id PK
    INTEGER usuario_id FK
    TEXT email
    INTEGER sucesso
    TEXT momento
  }
  ferias {
    INTEGER id PK
    INTEGER funcionario_id FK
    TEXT data_inicio
    TEXT data_fim
    TEXT situacao
  }
  cliente {
    INTEGER id PK
    TEXT nome
    TEXT cpf UK
    TEXT telefone
    TEXT email
    TEXT cidade
    TEXT origem
    INTEGER vendedor_id FK
  }
  moto {
    INTEGER id PK
    TEXT codigo UK
    TEXT marca
    TEXT modelo
    INTEGER ano
    TEXT placa
    TEXT chassi
    REAL custo
    REAL preco_venda
    TEXT data_entrada
    TEXT data_saida
    TEXT situacao
  }
  negociacao {
    INTEGER id PK
    INTEGER cliente_id FK
    INTEGER moto_id FK
    INTEGER vendedor_id FK
    TEXT etapa
    REAL valor_negociado
    TEXT motivo_perda
  }
  negociacao_historico {
    INTEGER id PK
    INTEGER negociacao_id FK
    TEXT etapa_de
    TEXT etapa_para
    TEXT responsavel
    TEXT momento
  }
  contrato {
    INTEGER id PK
    TEXT numero UK
    INTEGER negociacao_id FK
    INTEGER cliente_id FK
    INTEGER moto_id FK
    INTEGER vendedor_id FK
    TEXT forma_pagamento
    REAL valor_total
    REAL valor_entrada
    TEXT situacao
  }
  parcela {
    INTEGER id PK
    INTEGER contrato_id FK
    INTEGER numero
    TEXT vencimento
    REAL valor
    TEXT data_pagamento
    TEXT situacao
  }
  cobranca {
    INTEGER id PK
    INTEGER parcela_id FK
    TEXT acao
    TEXT momento
  }
  chamado {
    INTEGER id PK
    INTEGER cliente_id FK
    INTEGER moto_id FK
    INTEGER responsavel_id FK
    TEXT assunto
    TEXT situacao
    TEXT abertura
  }
  parametro {
    TEXT chave PK
    TEXT valor
    TEXT descricao
  }`;

const pagina = (codigo) => `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin:0; background:#fff; font-family:"Segoe UI",system-ui,sans-serif; }
  #alvo { display:inline-block; padding:28px; }
</style>
<div id="alvo" class="mermaid">${codigo}</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      primaryColor: '#FFF4D6', primaryBorderColor: '#B98708', primaryTextColor: '#24221D',
      lineColor: '#5C574C', fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '15px',
    },
    er: { useMaxWidth: false, entityPadding: 12 },
  });
</script>`;

const NAVEGADORES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const navegador = NAVEGADORES.find((c) => existsSync(c));
if (!navegador) { console.error('  Chrome/Edge nao encontrado.'); process.exit(1); }

mkdirSync(DESTINO, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: navegador,
  headless: 'new',
  defaultViewport: { width: 2000, height: 1400, deviceScaleFactor: 2 },
});

console.log('');
for (const [arquivo, codigo, titulo] of [
  ['19-modelo-conceitual', CONCEITUAL, 'Modelo Conceitual'],
  ['20-modelo-logico', LOGICO, 'Modelo Logico'],
]) {
  const temporario = join(tmpdir(), `${arquivo}.html`);
  writeFileSync(temporario, pagina(codigo), 'utf8');

  const aba = await browser.newPage();
  aba.on('console', (m) => { if (m.type() === 'error') console.log('    [console]', m.text()); });
  aba.on('pageerror', (e) => console.log('    [erro]', e.message));
  await aba.goto(`file:///${temporario.replaceAll('\\', '/')}`, { waitUntil: 'networkidle0' });
  await aba.waitForSelector('#alvo svg', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 500));

  const destino = join(DESTINO, `${arquivo}.png`);
  await (await aba.$('#alvo')).screenshot({ path: destino });
  console.log(`  ${arquivo.padEnd(22)} ${titulo}`);
  await aba.close();
}

await browser.close();
console.log('');
console.log(`  Diagramas salvos em ${DESTINO}`);
console.log('');
