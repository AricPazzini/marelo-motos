// =====================================================================
//  Gera os diagramas UML da Documentacao de Sistema (Engenharia de
//  Software II) a partir do sistema real.
//
//  Sao treze figuras, todas derivadas do codigo que esta no repositorio:
//    1. classes            <- banco/schema.sql
//    2. atividade venda    <- servidor/regras.js  (fecharVenda)
//    3. atividade cobranca <- servidor/regras.js  (reguaDeCobranca)
//    4. sequencia login    <- servidor/auth.js    (entrar)
//    5. sequencia venda    <- servidor/api.js + regras.js
//    6. estado negociacao  <- coluna negociacao.etapa
//    7. estado parcela     <- parcela.situacao + visao vw_parcela
//
//  Mudou o sistema? Roda de novo e as figuras acompanham.
//
//  Como rodar:  node ferramentas/gerar-uml.js ["pasta de destino"]
// =====================================================================

import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.argv[2] || join(RAIZ, 'docs', 'uml');

// ---------------------------------------------------------------------
// 1. DIAGRAMA DE CLASSES  (espelha banco/schema.sql)
// ---------------------------------------------------------------------
const CLASSES = `classDiagram
  direction LR

  class Pessoa {
    <<abstract>>
    #int id
    #String nome
    #String cpf
    +validarCpf() boolean
  }
  class Cliente {
    -String telefone
    -String email
    -String cidade
    -String origem
    -Date criadoEm
    +estaNaCarteiraDe(vendedor) boolean
  }
  class Funcionario {
    -String cargo
    -String setor
    -Date dataAdmissao
    -Date dataDesligamento
    -double salario
    -double percentualComissao
    -int metaMensal
    -String situacao
    +calcularComissao(competencia) double
    +desligar(data) void
  }
  class Usuario {
    -int id
    -String email
    -String senhaHash
    -String perfil
    -boolean ativo
    +autenticar(senha) boolean
    +temPermissao(acao) boolean
  }
  class LogAcesso {
    -int id
    -String email
    -boolean sucesso
    -Date momento
  }
  class Ferias {
    -int id
    -Date dataInicio
    -Date dataFim
    -String situacao
    +diasParaInicio() int
  }
  class Moto {
    -int id
    -String codigo
    -String marca
    -String modelo
    -int ano
    -String placa
    -String chassi
    -double custo
    -double precoVenda
    -Date dataEntrada
    -Date dataSaida
    -String situacao
    +diasNoPatio() int
    +darBaixa() void
  }
  class Negociacao {
    -int id
    -String etapa
    -double valorNegociado
    -String motivoPerda
    -Date atualizadoEm
    +moverEtapa(novaEtapa, responsavel) void
  }
  class NegociacaoHistorico {
    -int id
    -String etapaDe
    -String etapaPara
    -String responsavel
    -Date momento
  }
  class Contrato {
    -int id
    -String numero
    -String formaPagamento
    -double valorTotal
    -double valorEntrada
    -int qtdParcelas
    -String banco
    -Date dataEmissao
    -String situacao
    +gerarParcelas() void
    +cancelar(usuario) void
  }
  class Parcela {
    -int id
    -int numero
    -double valor
    -Date vencimento
    -Date dataPagamento
    -String situacao
    +situacaoReal() String
    +diasAtraso() int
  }
  class Cobranca {
    -int id
    -String tipo
    -String canal
    -Date momento
  }
  class Chamado {
    -int id
    -String numero
    -String assunto
    -Date dataAbertura
    -Date ultimaMovimentacao
    -String situacao
    +estaAtrasado() boolean
  }
  class Despesa {
    -int id
    -String descricao
    -String categoria
    -double valor
    -Date vencimento
    -String situacao
  }
  class Parametro {
    -String chave
    -String valor
    -String descricao
  }

  Pessoa <|-- Cliente : especializa
  Pessoa <|-- Funcionario : especializa

  Funcionario "0..1" -- "0..1" Usuario : acessa por
  Usuario "1" --> "0..*" LogAcesso : registra
  Funcionario "1" *-- "0..*" Ferias : programa
  Funcionario "0..1" --> "0..*" Cliente : atende na carteira
  Funcionario "1" --> "0..*" Negociacao : conduz
  Funcionario "1" --> "0..*" Contrato : vende

  Cliente "1" --> "0..*" Negociacao : participa de
  Cliente "1" --> "0..*" Contrato : assina
  Cliente "1" --> "0..*" Chamado : abre

  Moto "0..1" --> "0..*" Negociacao : e o interesse de
  Moto "0..1" --> "0..*" Chamado : motiva

  Negociacao "1" *-- "1..*" NegociacaoHistorico : registra
  Negociacao "0..1" --> "0..1" Contrato : se torna

  Contrato "0..1" o-- "1" Moto : agrega
  Contrato "1" *-- "1..*" Parcela : gera
  Parcela "1" *-- "0..*" Cobranca : aciona`;

// ---------------------------------------------------------------------
// 1a..1d. RECORTES DO DIAGRAMA DE CLASSES
//
//  O modelo inteiro tem quinze classes e, reduzido para caber na folha
//  A4, fica ilegivel. Entao a visao geral serve de mapa e estes quatro
//  recortes mostram as mesmas classes em tamanho de leitura, uma area
//  do sistema por vez. As classes que aparecem so para dar o contexto
//  da ligacao sao desenhadas apenas com o nome, como a UML permite.
// ---------------------------------------------------------------------
const CLASSES_PESSOAS = `classDiagram
  direction TB

  class Pessoa {
    <<abstract>>
    #int id
    #String nome
    #String cpf
    +validarCpf() boolean
  }
  class Cliente {
    -String telefone
    -String email
    -String cidade
    -String origem
    -Date criadoEm
    +estaNaCarteiraDe(vendedor) boolean
  }
  class Funcionario {
    -String cargo
    -String setor
    -Date dataAdmissao
    -Date dataDesligamento
    -double salario
    -double percentualComissao
    -int metaMensal
    -String situacao
    +calcularComissao(competencia) double
    +desligar(data) void
  }

  Pessoa <|-- Cliente
  Pessoa <|-- Funcionario
  Funcionario "0..1" --> "0..*" Cliente : atende na carteira`;

const CLASSES_FUNIL = `classDiagram
  direction TB

  class Cliente
  class Funcionario
  class Moto {
    -int id
    -String codigo
    -String marca
    -String modelo
    -int ano
    -String placa
    -String chassi
    -double custo
    -double precoVenda
    -Date dataEntrada
    -String situacao
    +diasNoPatio() int
    +darBaixa() void
  }
  class Negociacao {
    -int id
    -String etapa
    -double valorNegociado
    -String motivoPerda
    -Date atualizadoEm
    +moverEtapa(novaEtapa, responsavel) void
  }
  class NegociacaoHistorico {
    -int id
    -String etapaDe
    -String etapaPara
    -String responsavel
    -Date momento
  }
  class Contrato

  Cliente "1" --> "0..*" Negociacao : participa de
  Funcionario "1" --> "0..*" Negociacao : conduz
  Moto "0..1" --> "0..*" Negociacao : e o interesse de
  Negociacao "1" *-- "1..*" NegociacaoHistorico : registra
  Negociacao "0..1" --> "0..1" Contrato : se torna`;

const CLASSES_VENDA = `classDiagram
  direction TB

  class Cliente
  class Moto
  class Contrato {
    -int id
    -String numero
    -String formaPagamento
    -double valorTotal
    -double valorEntrada
    -int qtdParcelas
    -String banco
    -Date dataEmissao
    -String situacao
    +gerarParcelas() void
    +cancelar(usuario) void
  }
  class Parcela {
    -int id
    -int numero
    -double valor
    -Date vencimento
    -Date dataPagamento
    -String situacao
    +situacaoReal() String
    +diasAtraso() int
  }
  class Cobranca {
    -int id
    -String tipo
    -String canal
    -Date momento
  }

  Cliente "1" --> "0..*" Contrato : assina
  Contrato "0..1" o-- "1" Moto : agrega
  Contrato "1" *-- "1..*" Parcela : gera
  Parcela "1" *-- "0..*" Cobranca : aciona`;

const CLASSES_ACESSO = `classDiagram
  direction TB

  class Funcionario
  class Usuario {
    -int id
    -String email
    -String senhaHash
    -String perfil
    -boolean ativo
    +autenticar(senha) boolean
    +temPermissao(acao) boolean
  }
  class LogAcesso {
    -int id
    -String email
    -boolean sucesso
    -Date momento
  }
  class Ferias {
    -int id
    -Date dataInicio
    -Date dataFim
    -String situacao
    +diasParaInicio() int
  }

  Funcionario "0..1" -- "0..1" Usuario : acessa por
  Usuario "1" --> "0..*" LogAcesso : registra
  Funcionario "1" *-- "0..*" Ferias : programa`;

const CLASSES_APOIO = `classDiagram
  direction TB

  class Cliente
  class Moto
  class Chamado {
    -int id
    -String numero
    -String assunto
    -Date dataAbertura
    -Date ultimaMovimentacao
    -String situacao
    +estaAtrasado() boolean
  }
  class Despesa {
    -int id
    -String descricao
    -String categoria
    -double valor
    -Date vencimento
    -String situacao
  }
  class Parametro {
    -String chave
    -String valor
    -String descricao
  }

  Cliente "1" --> "0..*" Chamado : abre
  Moto "0..1" --> "0..*" Chamado : motiva`;

// ---------------------------------------------------------------------
// 1d. CLASSE ASSOCIATIVA  (desenho proprio: o mermaid nao tem a notacao)
//
//  Cliente e Moto se relacionam muitos-para-muitos: um cliente se
//  interessa por varias motos e a mesma moto interessa a varios
//  clientes. O que precisa ser guardado dessa relacao (a etapa do
//  funil, o valor negociado, o motivo da perda) nao cabe em nenhuma
//  das duas, entao vira a classe associativa Negociacao.
// ---------------------------------------------------------------------
const CLASSE_ASSOCIATIVA = `<svg width="940" height="470" viewBox="0 0 940 470"
     xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, system-ui, sans-serif">
  <defs>
    <style>
      .cx   { fill:#FFF4D6; stroke:#B98708; stroke-width:1.6; }
      .ti   { font-size:21px; font-weight:600; fill:#24221D; text-anchor:middle; }
      .at   { font-size:18px; fill:#24221D; }
      .li   { stroke:#5C574C; stroke-width:1.6; fill:none; }
      .tr   { stroke:#5C574C; stroke-width:1.6; fill:none; stroke-dasharray:7 5; }
      .mu   { font-size:17px; fill:#24221D; }
      .rot  { font-size:18px; font-style:italic; fill:#24221D; text-anchor:middle; }
    </style>
  </defs>

  <!-- Cliente -->
  <rect class="cx" x="40"  y="40" width="250" height="34"/>
  <rect class="cx" x="40"  y="74" width="250" height="86"/>
  <text class="ti" x="165" y="63">Cliente</text>
  <text class="at" x="54"  y="96">-int id</text>
  <text class="at" x="54"  y="118">-String nome</text>
  <text class="at" x="54"  y="140">-String telefone</text>

  <!-- Moto -->
  <rect class="cx" x="650" y="40" width="250" height="34"/>
  <rect class="cx" x="650" y="74" width="250" height="86"/>
  <text class="ti" x="775" y="63">Moto</text>
  <text class="at" x="664" y="96">-String codigo</text>
  <text class="at" x="664" y="118">-String modelo</text>
  <text class="at" x="664" y="140">-double precoVenda</text>

  <!-- associacao muitos para muitos -->
  <line class="li" x1="290" y1="100" x2="650" y2="100"/>
  <text class="mu"  x="300" y="92">0..*</text>
  <text class="mu"  x="612" y="92">0..*</text>
  <text class="rot" x="470" y="86">interessa-se por</text>

  <!-- ligacao tracejada ate a classe associativa -->
  <line class="tr" x1="470" y1="100" x2="470" y2="250"/>

  <!-- Negociacao -->
  <rect class="cx" x="320" y="250" width="300" height="34"/>
  <rect class="cx" x="320" y="284" width="300" height="108"/>
  <rect class="cx" x="320" y="392" width="300" height="44"/>
  <text class="ti" x="470" y="273">Negociacao</text>
  <text class="at" x="334" y="306">-String etapa</text>
  <text class="at" x="334" y="328">-double valorNegociado</text>
  <text class="at" x="334" y="350">-String motivoPerda</text>
  <text class="at" x="334" y="372">-Date atualizadoEm</text>
  <text class="at" x="334" y="420">+moverEtapa(novaEtapa, responsavel)</text>
</svg>`;

// ---------------------------------------------------------------------
// 2. ATIVIDADE - FECHAMENTO DA VENDA  (regras.js -> fecharVenda)
// ---------------------------------------------------------------------
const ATIVIDADE_VENDA = `flowchart TD
  ini(( )) --> a1["Selecionar a negociação no funil"]
  a1 --> a2["Informar a condição de pagamento"]
  a2 --> d1{"Dados válidos?"}
  d1 -- "não" --> e1["Exibir a regra violada ao usuário"]
  e1 --> fimErro((("&nbsp;")))
  d1 -- "sim" --> t1["Abrir transação no banco"]
  t1 --> a3["Gerar o contrato com número sequencial"]
  a3 --> a4["Gerar as parcelas da condição negociada"]
  a4 --> a5["Dar baixa da motocicleta no estoque"]
  a5 --> a6["Mover a negociação para fechada"]
  a6 --> a7["Registrar o histórico com o responsável"]
  a7 --> d2{"Todos os passos<br/>concluídos?"}
  d2 -- "não" --> r1["Desfazer tudo (rollback)"]
  r1 --> fimErro
  d2 -- "sim" --> c1["Confirmar a transação (commit)"]
  c1 --> a8["Exibir o contrato e as parcelas geradas"]
  a8 --> fim((("&nbsp;")))

  nota["Os quatro passos gravados acontecem dentro de uma única transação:<br/>ou todos valem, ou nada é gravado.<br/>Fonte: servidor/regras.js — fecharVenda()"]
  nota -.- a3

  classDef obs fill:#FFF4D6,stroke:#B98708,color:#24221D,text-align:left
  class nota obs`;

// ---------------------------------------------------------------------
// 3. ATIVIDADE - REGUA DE COBRANCA  (regras.js -> reguaDeCobranca)
// ---------------------------------------------------------------------
const ATIVIDADE_COBRANCA = `flowchart TD
  ini(( )) --> a1["Consultar parcelas vencidas e a vencer"]
  a1 --> a2["Calcular os dias de atraso de cada parcela"]
  a2 --> d1{"Já venceu?"}
  d1 -- "não, vence em até 3 dias" --> ac1["Enviar lembrete ao cliente"]
  d1 -- "sim" --> d2{"Atraso de<br/>quantos dias?"}
  d2 -- "1 a 6 dias" --> ac2["Enviar a segunda via do boleto"]
  d2 -- "7 a 14 dias" --> ac3["Acionar o contato do financeiro"]
  d2 -- "15 dias ou mais" --> ac4["Propor a negativação do cliente"]
  ac4 --> d3{"O proprietário<br/>autoriza?"}
  d3 -- "não" --> reg["Registrar a cobrança executada"]
  d3 -- "sim" --> ac5["Registrar a negativação"]
  ac1 --> reg
  ac2 --> reg
  ac3 --> reg
  ac5 --> reg
  reg --> fim((("&nbsp;")))

  nota["Os quatro prazos ficam na tabela parametro e podem ser alterados em<br/>Configurações, sem mexer no programa (RNF-05.1).<br/>A negativação exige autorização do proprietário (RNF-05.2)."]
  nota -.- d2

  classDef obs fill:#FFF4D6,stroke:#B98708,color:#24221D,text-align:left
  class nota obs`;

// ---------------------------------------------------------------------
// 4. SEQUENCIA - AUTENTICACAO  (servidor/auth.js -> entrar)
// ---------------------------------------------------------------------
const SEQ_LOGIN = `sequenceDiagram
  autonumber
  actor U as Usuário
  participant T as Tela de login
  participant S as Servidor
  participant A as Autenticação
  participant B as Banco

  U->>+T: informa e-mail e senha
  T->>+S: POST /api/login
  S->>+A: entrar(email, senha)
  A->>+B: SELECT usuario
  B-->>-A: registro do usuário
  A->>A: conferirSenha(senha, hash)
  alt senha confere e usuário ativo
    A->>+B: INSERT log_acesso (sucesso)
    B-->>-A: gravado
    A->>A: gerarToken()
    A-->>S: token, usuário e permissões
    S-->>T: cookie de sessão
    T-->>U: abre o painel do seu perfil
  else senha inválida ou usuário inativo
    A->>+B: INSERT log_acesso (falha)
    B-->>-A: gravado
    A-->>S: null
    S-->>T: 401 não autorizado
    T-->>U: e-mail ou senha inválidos
  end
  deactivate A
  deactivate S
  deactivate T`;

// ---------------------------------------------------------------------
// 5. SEQUENCIA - REGISTRAR VENDA  (api.js + regras.js)
// ---------------------------------------------------------------------
const SEQ_VENDA = `sequenceDiagram
  autonumber
  actor V as Vendedor
  participant T as Tela Comercial
  participant S as Servidor
  participant R as Regras
  participant B as Banco

  V->>+T: confirma o fechamento da venda
  T->>+S: POST /api/vendas/fechar
  S->>S: pode(comercial.escrever)
  S->>+R: fecharVenda(dados, usuário)
  R->>R: validarCondicao()
  R->>+B: BEGIN TRANSACTION
  R->>B: INSERT contrato
  R->>B: INSERT parcela
  R->>B: UPDATE moto (vendida)
  R->>B: UPDATE negociacao (fechada)
  R->>B: INSERT negociacao_historico
  alt todos os passos concluídos
    R->>B: COMMIT
    B-->>R: gravado
    R-->>S: contrato e parcelas
    S-->>T: 200 OK
    T-->>V: exibe o contrato gerado
  else algum passo falhou
    R->>B: ROLLBACK
    B-->>R: desfeito
    R-->>S: ErroDeRegra
    S-->>T: 400 + mensagem da regra
    T-->>V: nada foi gravado
  end
  deactivate B
  deactivate R
  deactivate S
  deactivate T`;

// ---------------------------------------------------------------------
// 6. ESTADO - NEGOCIACAO  (coluna negociacao.etapa)
// ---------------------------------------------------------------------
const ESTADO_NEGOCIACAO = `stateDiagram-v2
  direction TB
  [*] --> Lead : cliente cadastrado

  state "Lead" as Lead
  state "Em contato" as Contato
  state "Proposta" as Proposta
  state "Financiamento" as Financiamento
  state "Fechada" as Fechada
  state "Perdida" as Perdida

  Lead --> Contato : primeiro atendimento
  Contato --> Proposta : proposta enviada
  Proposta --> Financiamento : cliente opta por financiar
  Proposta --> Fechada : pagamento à vista aprovado
  Financiamento --> Fechada : crédito aprovado
  Fechada --> [*]

  Contato --> Perdida : cliente desiste
  Proposta --> Perdida : proposta recusada
  Financiamento --> Perdida : crédito negado
  Perdida --> [*]

  note right of Fechada
    Ao entrar neste estado o sistema gera o
    contrato, cria as parcelas e dá baixa da
    moto no estoque, na mesma transação.
  end note

  note left of Lead
    Toda mudança de estado grava uma linha em
    negociacao_historico, com data e responsável.
  end note`;

// ---------------------------------------------------------------------
// 7. ESTADO - PARCELA  (parcela.situacao + visao vw_parcela)
// ---------------------------------------------------------------------
const ESTADO_PARCELA = `stateDiagram-v2
  direction TB
  [*] --> Aberta : contrato gerado

  state "Aberta" as Aberta
  state "Vencida" as Vencida
  state "Paga" as Paga
  state "Cancelada" as Cancelada

  Aberta --> Vencida : vencimento anterior a hoje
  Aberta --> Paga : pagamento registrado
  Vencida --> Paga : pagamento em atraso registrado
  Aberta --> Cancelada : contrato cancelado pelo proprietário
  Vencida --> Cancelada : contrato cancelado pelo proprietário
  Paga --> [*]
  Cancelada --> [*]

  note right of Vencida
    Este estado nunca é gravado no banco: é deduzido
    na consulta pela visão vw_parcela, comparando o
    vencimento com a data de hoje. Assim nenhuma
    parcela fica como "em aberto" depois de vencer.
  end note`;

// ---------------------------------------------------------------------
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
      lineColor: '#5C574C', secondaryColor: '#FAFAF8', tertiaryColor: '#FFFFFF',
      noteBkgColor: '#FFF4D6', noteBorderColor: '#B98708', noteTextColor: '#24221D',
      actorBkg: '#FFF4D6', actorBorder: '#B98708', actorTextColor: '#24221D',
      signalColor: '#5C574C', signalTextColor: '#24221D',
      activationBkgColor: '#FFE9B0', activationBorderColor: '#B98708',
      labelBoxBkgColor: '#FFF4D6', labelBoxBorderColor: '#B98708',
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '15px',
    },
    class: { useMaxWidth: false },
    sequence: { useMaxWidth: false, wrap: false, actorMargin: 60, boxMargin: 12 },
    state: { useMaxWidth: false },
    flowchart: { useMaxWidth: false, nodeSpacing: 45, rankSpacing: 50, htmlLabels: true },
  });
</script>`;

const paginaCrua = (svg) => `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin:0; background:#fff; }
  #alvo { display:inline-block; padding:28px; }
</style>
<div id="alvo">${svg}</div>`;

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
  defaultViewport: { width: 2200, height: 1600, deviceScaleFactor: 2 },
});

console.log('');
let erros = 0;

for (const [arquivo, codigo, titulo, cru] of [
  ['uml-01-classes', CLASSES, 'Diagrama de classes (visao geral)'],
  ['uml-01a-classes-pessoas', CLASSES_PESSOAS, 'Classes - pessoas (generalizacao)'],
  ['uml-01b-classes-funil', CLASSES_FUNIL, 'Classes - funil de vendas'],
  ['uml-01c-classes-venda', CLASSES_VENDA, 'Classes - venda e cobranca'],
  ['uml-01d-classes-acesso', CLASSES_ACESSO, 'Classes - acesso do usuario'],
  ['uml-01e-classes-apoio', CLASSES_APOIO, 'Classes - pos-venda e apoio'],
  ['uml-01f-classe-associativa', CLASSE_ASSOCIATIVA, 'Classe associativa Negociacao', true],
  ['uml-02-atividade-venda', ATIVIDADE_VENDA, 'Atividade - fechamento da venda'],
  ['uml-03-atividade-cobranca', ATIVIDADE_COBRANCA, 'Atividade - regua de cobranca'],
  ['uml-04-sequencia-login', SEQ_LOGIN, 'Sequencia - autenticacao'],
  ['uml-05-sequencia-venda', SEQ_VENDA, 'Sequencia - registrar venda'],
  ['uml-06-estado-negociacao', ESTADO_NEGOCIACAO, 'Estado - negociacao'],
  ['uml-07-estado-parcela', ESTADO_PARCELA, 'Estado - parcela'],
]) {
  const temporario = join(tmpdir(), `${arquivo}.html`);
  writeFileSync(temporario, cru ? paginaCrua(codigo) : pagina(codigo), 'utf8');

  const aba = await browser.newPage();
  let falhou = null;
  aba.on('console', (m) => { if (m.type() === 'error') falhou = m.text(); });
  aba.on('pageerror', (e) => { falhou = e.message; });

  await aba.goto(`file:///${temporario.replaceAll('\\', '/')}`, { waitUntil: 'networkidle0' });
  try {
    await aba.waitForSelector('#alvo svg', { timeout: cru ? 5000 : 25000 });
  } catch {
    console.log(`  FALHOU  ${arquivo}: ${falhou || 'o mermaid nao desenhou'}`);
    erros++;
    await aba.close();
    continue;
  }
  await new Promise((r) => setTimeout(r, 400));

  const destino = join(DESTINO, `${arquivo}.png`);
  await (await aba.$('#alvo')).screenshot({ path: destino });
  console.log(`  ${arquivo.padEnd(28)} ${titulo}`);
  await aba.close();
}

await browser.close();
console.log('');
console.log(erros ? `  ${erros} diagrama(s) falharam.` : `  Treze diagramas salvos em ${DESTINO}`);
console.log('');
process.exit(erros ? 1 : 0);
