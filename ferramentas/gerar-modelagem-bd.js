// =====================================================================
//  gerar-modelagem-bd.js
//
//  Monta o documento "Modelagem de Banco de Dados" (Banco de Dados I -
//  FATEC) em PDF, a partir do modelo real do sistema Marelo Motos:
//  resumo dos requisitos, Modelo Conceitual (DER), Modelo Logico
//  (relacional), esquema textual e integrantes do grupo.
//
//  Como rodar:  node ferramentas/gerar-modelagem-bd.js ["arquivo.pdf"]
// =====================================================================
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { figuraConceitualGeral, figuraLegenda } from './der-conceitual.js';
import * as A from './der-atributos.js';
import { figuraLogico, TABELAS, FKS } from './der-logico.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.argv[2] || join(RAIZ, 'docs', 'MODELAGEM DE BANCO DE DADOS - MARELO MOTOS.pdf');

const INTEGRANTES = [
  'Alessandro Tavares Cláudio Junior',
  'Aric Proença Pazzini',
  'Jorge Munir Kasokws Ozi Galvão',
  'Lucas Belfort Darantes Medeiros',
];

// ---------------------------------------------------------------- textos

const RF = [
  ['RF-01', 'Gerenciar o funil de vendas e o cadastro de clientes',
    'Cadastrar clientes e acompanhar cada negociação pelas etapas lead, contato, proposta, financiamento e fechada ou perdida. Cada mudança de etapa fica registrada com data e responsável.'],
  ['RF-02', 'Registrar e acompanhar os chamados de pós-venda (SAC)',
    'Abrir chamados do cliente após a venda, indicar o responsável e acompanhar até a conclusão, sem perder o histórico.'],
  ['RF-03', 'Controlar o estoque de motocicletas',
    'Manter as motos em estoque com custo, preço, data de entrada e situação, e destacar as que estão paradas há muito tempo.'],
  ['RF-04', 'Gerar contratos e boletos das vendas',
    'Ao fechar a venda, gerar um contrato numerado e as parcelas correspondentes, dando baixa da moto no estoque.'],
  ['RF-05', 'Controlar a inadimplência e a cobrança',
    'Identificar parcelas vencidas e registrar as ações da régua de cobrança executadas para cada uma.'],
  ['RF-06', 'Gerenciar os funcionários da loja',
    'Cadastrar a equipe, programar férias e registrar o desligamento sem apagar o histórico da pessoa.'],
  ['RF-07', 'Calcular a comissão dos vendedores',
    'Calcular a comissão do mês de cada vendedor a partir dos contratos vendidos e do percentual do próprio vendedor.'],
  ['RF-08', 'Apresentar o painel gerencial do proprietário',
    'Reunir em uma tela os números do estoque, do funil, da inadimplência e das comissões, alimentados pelos demais módulos.'],
];

const RNF = [
  ['RNFR-01.1', 'Cada vendedor enxerga apenas os clientes da própria carteira.',
    'A entidade CLIENTE guarda o vínculo com o FUNCIONÁRIO que a atende (coluna vendedor_id).'],
  ['RNFR-01.2', 'CPF válido e ao menos um telefone por cliente.',
    'cpf com restrição UNIQUE e telefone NOT NULL na tabela cliente.'],
  ['RNFR-02.1', 'Chamado sem movimentação por mais de 5 dias é considerado atrasado.',
    'A coluna ultima_movimentacao guarda a data; o atraso é calculado na consulta, não armazenado.'],
  ['RNFR-02.2', 'O histórico do chamado é preservado depois de resolvido.',
    'O chamado resolvido recebe data_conclusao e permanece na tabela; nada é excluído.'],
  ['RNFR-03.1', 'O tempo de pátio da moto se atualiza sozinho.',
    'Atributo derivado dias_patio, calculado a partir de data_entrada a cada consulta.'],
  ['RNFR-03.2', 'Motos paradas há mais de 90 dias aparecem destacadas.',
    'Também derivado do atributo data_entrada, sem coluna redundante no banco.'],
  ['RNFR-04.2', 'O número do contrato é único e sequencial.',
    'Coluna numero com restrição UNIQUE (chave alternativa) na tabela contrato.'],
  ['RNFR-04.3', 'Somente o proprietário cancela um contrato.',
    'Colunas cancelado_por (FK para usuario) e motivo_cancelamento registram quem cancelou e por quê.'],
  ['RNFR-05.2', 'A negativação de um cliente exige autorização do proprietário.',
    'A ação de cobrança guarda autorizado_por (FK para usuario).'],
  ['RNFR-06.3', 'O desligamento preserva o histórico do funcionário.',
    'Coluna data_desligamento e situação "desligado"; o registro nunca é apagado.'],
  ['RNFR-07.1', 'A comissão só conta a venda cuja primeira parcela foi quitada.',
    'A identificação da parcela pelo par (contrato, número) permite localizar a parcela 1.'],
  ['RNFR-07.3', 'O percentual de comissão é configurável por vendedor.',
    'Atributo percentual_comissao em FUNCIONÁRIO e entidade PARÂMETRO para os demais ajustes da loja.'],
  ['RNFS-01', 'Login e senha individuais, com perfil de acesso por usuário.',
    'Entidades USUÁRIO (com perfil e senha criptografada) e LOG_ACESSO (trilha de tentativas de login).'],
];

const RELACIONAMENTOS = [
  ['FUNCIONÁRIO', 'programa', 'FÉRIAS', '(1,1)', '(0,n)',
    'Cada período de férias pertence a exatamente um funcionário; um funcionário pode ter vários períodos programados ou nenhum.'],
  ['FUNCIONÁRIO', 'acessa por', 'USUÁRIO', '(1,1)', '(0,1)',
    'Cada login pertence a um único funcionário; um funcionário pode ter um login ou nenhum.'],
  ['USUÁRIO', 'registra', 'LOG_ACESSO', '(0,1)', '(0,n)',
    'Cada tentativa de acesso pode estar ligada a um usuário (ou a nenhum, quando o e-mail informado não existe).'],
  ['FUNCIONÁRIO', 'atende', 'CLIENTE', '(0,1)', '(0,n)',
    'Cada cliente é atendido por, no máximo, um vendedor (a carteira); um vendedor atende vários clientes.'],
  ['FUNCIONÁRIO', 'conduz', 'NEGOCIAÇÃO', '(1,1)', '(0,n)',
    'Toda negociação tem um vendedor responsável; um vendedor conduz várias negociações.'],
  ['CLIENTE', 'participa de', 'NEGOCIAÇÃO', '(1,1)', '(0,n)',
    'Toda negociação é de um único cliente; um cliente pode ter várias negociações.'],
  ['MOTOCICLETA', 'é o interesse de', 'NEGOCIAÇÃO', '(0,1)', '(0,n)',
    'A negociação pode ou não ter uma moto escolhida; a mesma moto pode interessar a várias negociações.'],
  ['NEGOCIAÇÃO', 'registra etapa', 'HISTÓRICO_ETAPA', '(1,1)', '(1,n)',
    'Cada registro de histórico pertence a uma negociação; toda negociação tem ao menos um registro (a criação).'],
  ['NEGOCIAÇÃO', 'origina', 'CONTRATO', '(0,1)', '(0,1)',
    'A negociação pode virar um contrato; o contrato pode ter nascido de uma negociação (venda de balcão não tem).'],
  ['CLIENTE', 'assina', 'CONTRATO', '(1,1)', '(0,n)',
    'Todo contrato é de um cliente; um cliente pode assinar vários contratos ao longo do tempo.'],
  ['MOTOCICLETA', 'é vendida em', 'CONTRATO', '(1,1)', '(0,1)',
    'Todo contrato vende exatamente uma moto; cada moto é vendida em, no máximo, um contrato.'],
  ['FUNCIONÁRIO', 'vende', 'CONTRATO', '(1,1)', '(0,n)',
    'Todo contrato tem um vendedor (base da comissão); um vendedor fecha vários contratos.'],
  ['CONTRATO', 'gera', 'PARCELA', '(1,1)', '(1,n)',
    'Toda parcela pertence a um contrato e não existe sem ele; todo contrato gera ao menos uma parcela.'],
  ['PARCELA', 'aciona', 'COBRANÇA', '(1,1)', '(0,n)',
    'Cada ação de cobrança se refere a uma parcela; a parcela pode acumular várias ações ou nenhuma.'],
  ['CLIENTE', 'abre', 'CHAMADO', '(1,1)', '(0,n)',
    'Todo chamado tem um cliente; o cliente pode abrir vários chamados.'],
  ['MOTOCICLETA', 'motiva', 'CHAMADO', '(0,1)', '(0,n)',
    'O chamado pode se referir a uma moto específica; a mesma moto pode motivar vários chamados.'],
  ['FUNCIONÁRIO', 'responde', 'CHAMADO', '(0,1)', '(0,n)',
    'O chamado pode ter um responsável designado; o funcionário responde por vários chamados.'],
];

// ------------------------------------------------- esquema textual (item 4.3)

const ordemTabelas = ['funcionario', 'ferias', 'usuario', 'log_acesso', 'cliente', 'moto',
  'negociacao', 'negociacao_historico', 'contrato', 'parcela', 'cobranca', 'chamado', 'parametro'];

function esquemaTextual() {
  return ordemTabelas.map((t) => {
    const cols = TABELAS[t].map((c) => {
      if (c.marca === 'PK') return `<u>${c.nome}</u>`;
      if (c.marca === 'FK') return `<i>${c.nome}</i>`;
      return c.nome;
    }).join(', ');
    const refs = FKS.filter((f) => f.f[0] === t)
      .map((f) => `<div class="ref">${f.f[1]} referencia ${f.p[0]}</div>`).join('');
    return `<div class="rel"><b>${t}</b> (${cols})${refs}</div>`;
  }).join('');
}

// ---------------------------------------------------------------- HTML

const semTitulo = (svg) => svg.replace(/<text[^>]*font-size="27"[\s\S]*?<\/text>/, '');
const fig = (svg, legenda) => `<figure class="figura">${semTitulo(svg)}<figcaption>${legenda}</figcaption></figure>`;
const figLarga = (svg, legenda) => `<section class="pagina-larga"><figure class="figura">${semTitulo(svg)}
  <figcaption>${legenda}</figcaption></figure></section>`;
const figAlta = (svg, legenda) => `<section class="pagina-alta"><figure class="figura">${semTitulo(svg)}
  <figcaption>${legenda}</figcaption></figure></section>`;

const tabela = (cabecalho, linhas, classe = '') => `<table class="${classe}">
  <thead><tr>${cabecalho.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const ESTILO = `
  @page { size: A4 portrait; margin: 20mm 18mm 18mm 20mm; }
  @page paisagem { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 11pt; color: #1B1A17;
         line-height: 1.5; margin: 0; }
  h1, h2, h3 { font-family: Calibri, Carlito, Arial, sans-serif; color: #1B1A17; line-height: 1.25; }
  h2 { font-size: 15pt; margin: 26px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #B98708;
       page-break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 18px 0 6px; color: #7A5A05; page-break-after: avoid; }
  p { margin: 0 0 9px; text-align: justify; }
  ul { margin: 0 0 10px 18px; padding: 0; }
  li { margin-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 9.5pt; }
  th { background: #FFE9B8; text-align: left; font-weight: 700; }
  th, td { border: 1px solid #C9C2B4; padding: 5px 7px; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #FBF8F2; }
  td.cod { font-weight: 700; white-space: nowrap; }
  td.card { text-align: center; font-weight: 700; color: #0F3D91; white-space: nowrap; }
  .capa { height: 247mm; display: flex; flex-direction: column; text-align: center;
          page-break-after: always; }
  .capa .topo { margin-top: 6mm; font-size: 13pt; line-height: 1.6; }
  .capa .meio { margin-top: auto; margin-bottom: auto; }
  .capa h1 { font-size: 23pt; margin: 0 0 6px; letter-spacing: 0.3px; }
  .capa .sub { font-size: 14pt; color: #5C574C; }
  .capa .disciplina { margin-top: 26mm; font-size: 12.5pt; line-height: 1.7; }
  .capa .nomes { margin-top: 10mm; font-size: 12pt; line-height: 1.9; }
  .capa .rodape { margin-top: auto; font-size: 12pt; }
  .figura { margin: 10px 0 16px; text-align: center; page-break-inside: avoid; }
  .figura svg { width: 100%; height: auto; border: 1px solid #E0D9C9; }
  figcaption { font-size: 9pt; color: #5C574C; margin-top: 5px; text-align: center; }
  .pagina-larga { page: paisagem; page-break-before: always; page-break-after: always; }
  .pagina-larga .figura svg { max-height: 163mm; width: auto; max-width: 100%; }
  .pagina-alta { page-break-before: always; page-break-after: always; }
  .pagina-alta .figura svg { max-height: 228mm; width: auto; max-width: 100%; }
  .nota { background: #FBF6E8; border-left: 4px solid #B98708; padding: 8px 12px; margin: 10px 0 14px;
          font-size: 10pt; page-break-inside: avoid; }
  .rel { margin-bottom: 9px; font-size: 10pt; page-break-inside: avoid; }
  .rel b { font-family: Consolas, monospace; font-size: 10.5pt; }
  .ref { margin-left: 34px; color: #4A4437; font-style: italic; font-size: 9.5pt; }
  .quebra { page-break-before: always; }
  code { font-family: Consolas, monospace; font-size: 10pt; background: #F5F1E8; padding: 0 3px; }
`;

function documento() {
  const hoje = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Modelagem de Banco de Dados - Marelo Motos</title><style>${ESTILO}</style></head><body>

<section class="capa">
  <div class="topo">
    <b>FATEC ITAPETININGA</b><br>
    Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas
  </div>
  <div class="meio">
    <h1>Modelagem de Banco de Dados</h1>
    <div class="sub">Modelo Conceitual e Modelo Lógico do sistema de gestão<br><b>Marelo Motos</b></div>
    <div class="disciplina">
      Disciplina: <b>Banco de Dados I</b><br>
      Professora: Dra. Andréia Rodrigues Casare<br>
      Atividade baseada nos requisitos do Projeto Integrador em ADS II
    </div>
    <div class="nomes">
      ${INTEGRANTES.map((n) => n).join('<br>')}
    </div>
  </div>
  <div class="rodape">Itapetininga — ${hoje}</div>
</section>

<h2>1. O sistema modelado</h2>
<p>A <b>Marelo Motos</b> é uma revenda de motocicletas novas e seminovas de Itapetininga (SP).
O sistema modelado neste trabalho é o mesmo que o grupo desenvolve no Projeto Integrador em ADS II:
um sistema de gestão que cobre o caminho completo da loja — do primeiro contato com o cliente até a
última parcela paga —, reunindo em um só lugar o que hoje está espalhado entre cadernos, planilhas e
conversas de WhatsApp.</p>
<p>O banco de dados precisa sustentar quatro frentes de trabalho que compartilham as mesmas
informações: o <b>comercial</b> (clientes, funil de vendas e pós-venda), o <b>estoque</b> de
motocicletas, o <b>financeiro</b> (contratos, parcelas e cobrança) e o <b>administrativo</b>
(funcionários, férias, comissões e acesso ao sistema). É essa necessidade de compartilhar dados sem
duplicá-los que justifica a modelagem apresentada a seguir.</p>

<h2>2. Resumo dos requisitos do sistema</h2>
<h3>2.1 Requisitos funcionais</h3>
<p>Os oito requisitos funcionais levantados com o proprietário da loja e registrados na documentação
do Projeto Integrador são os seguintes:</p>
${tabela(['Código', 'Requisito', 'O que o sistema precisa fazer'],
    RF.map(([c, t, d]) => [`<span class="cod">${c}</span>`, `<b>${t}</b>`, d]))}

<h3>2.2 Requisitos não funcionais que influenciam a modelagem</h3>
<p>Nem todo requisito não funcional chega ao banco de dados, mas os listados abaixo determinaram
decisões concretas de modelagem — uma restrição de integridade, um atributo derivado ou uma entidade
inteira:</p>
${tabela(['Código', 'Requisito', 'Consequência na modelagem'],
    RNF.map(([c, t, d]) => [`<span class="cod">${c}</span>`, t, d]))}

<h3>2.3 O que a modelagem precisa garantir</h3>
<ul>
  <li>Nenhum dado calculável deve ser armazenado: tempo de pátio, parcela vencida, chamado atrasado e
      comissão são <b>atributos derivados</b>, obtidos de datas e valores já guardados.</li>
  <li>Nada é apagado: desligamento de funcionário, chamado resolvido e contrato cancelado são
      registrados por <b>mudança de situação</b>, preservando o histórico.</li>
  <li>Toda ação sensível (cancelar contrato, negativar cliente, mudar a etapa de uma negociação)
      precisa guardar <b>quem fez e quando</b>.</li>
  <li>Os valores que a loja muda com frequência (prazos da régua de cobrança, limite de dias em
      estoque) ficam em dados, não no programa — daí a entidade <b>PARÂMETRO</b>.</li>
</ul>

<h2>3. Modelo Conceitual</h2>
<p>O Modelo Conceitual descreve <i>o que</i> o sistema precisa guardar, sem se preocupar com o
banco de dados que será usado. Foi construído na abordagem Entidade-Relacionamento, com a notação
adotada na disciplina: entidade em retângulo, relacionamento em losango, atributo em elipse, atributo
identificador com bolinha preenchida e cardinalidade escrita no par (mínimo, máximo).</p>

${fig(figuraLegenda(), 'Notação utilizada nos diagramas do Modelo Conceitual.')}

<h3>3.1 Entidades identificadas</h3>
${tabela(['Entidade', 'O que representa', 'Identificador'], [
    ['FUNCIONÁRIO', 'Cada pessoa da equipe da loja, com cargo, setor, salário e percentual de comissão.', 'cod_funcionario'],
    ['FÉRIAS', 'Cada período de férias programado ou já cumprido por um funcionário.', 'cod_ferias'],
    ['USUÁRIO', 'O acesso ao sistema: e-mail, senha criptografada e perfil (dono ou funcionário).', 'cod_usuario'],
    ['LOG_ACESSO', 'Cada tentativa de entrada no sistema, com ou sem sucesso.', 'cod_log'],
    ['CLIENTE', 'Quem compra ou pretende comprar, com CPF, telefone, cidade e origem do contato.', 'cod_cliente'],
    ['MOTOCICLETA', 'Cada moto do estoque, com custo, preço, datas de entrada e saída.', 'codigo'],
    ['NEGOCIAÇÃO', 'Uma venda em andamento e a etapa em que ela está no funil.', 'cod_negociacao'],
    ['HISTÓRICO_ETAPA', 'Cada mudança de etapa de uma negociação, com data e responsável.', 'cod_historico'],
    ['CONTRATO', 'A venda fechada: forma de pagamento, valor e situação.', 'numero'],
    ['PARCELA', 'Cada parcela gerada por um contrato. <b>Entidade fraca</b>: o número da parcela só identifica dentro do contrato.', 'numero (parcial)'],
    ['COBRANÇA', 'Cada ação da régua de cobrança executada sobre uma parcela.', 'cod_cobranca'],
    ['CHAMADO', 'Cada atendimento de pós-venda aberto pelo cliente.', 'numero'],
    ['PARÂMETRO', 'Configurações da loja que mudam sem alterar o programa.', 'chave'],
  ])}

<h3>3.2 Relacionamentos e cardinalidades</h3>
<p>A leitura de cada relacionamento do diagrama é a seguinte:</p>
${tabela(['Entidade A', 'Relacionamento', 'Entidade B', 'Card. A', 'Card. B', 'Leitura'],
    RELACIONAMENTOS.map(([a, r, b, ca, cb, l]) =>
      [`<b>${a}</b>`, r, `<b>${b}</b>`, `<span class="card">${ca}</span>`, `<span class="card">${cb}</span>`, l])
      .map((l) => [l[0], l[1], l[2], `<div class="card">${l[3].replace(/<[^>]+>/g, '')}</div>`,
        `<div class="card">${l[4].replace(/<[^>]+>/g, '')}</div>`, l[5]]))}
<div class="nota"><b>Como ler:</b> a cardinalidade escrita ao lado de uma entidade responde à
pergunta <i>"uma ocorrência da outra entidade se relaciona com quantas ocorrências desta?"</i>.
Em <b>FUNCIONÁRIO (1,1) — programa — (0,n) FÉRIAS</b>, o par (1,1) do lado do funcionário diz que
cada período de férias pertence a exatamente um funcionário, e o par (0,n) do lado de férias diz que
um funcionário pode ter de zero a vários períodos.</div>

<h3>3.3 Diagrama Entidade-Relacionamento</h3>
<p>A Figura 1 apresenta o Modelo Conceitual completo, com as treze entidades, os dezessete
relacionamentos e as cardinalidades de cada lado. Os atributos de cada entidade são detalhados nas
Figuras 2 a 8, para manter o diagrama principal legível.</p>

${figLarga(figuraConceitualGeral(), 'Figura 1 — Modelo Conceitual (DER) do sistema Marelo Motos.')}

<h3>3.4 Decisões de modelagem</h3>
<p><b>PARCELA é uma entidade fraca.</b> Uma parcela não existe fora do contrato que a gerou, e seu
número ("parcela 3 de 12") só identifica dentro daquele contrato: a parcela 3 do contrato
CT-2026-0001 é outra parcela 3 do contrato CT-2026-0002. Por isso a entidade aparece com retângulo
duplo, ligada ao contrato por um relacionamento identificador (losango duplo), e seu identificador é
parcial.</p>
<p><b>Atributos derivados não são armazenados.</b> São quatro: <code>dias_patio</code> e
<code>margem</code> em MOTOCICLETA e <code>dias_atraso</code> em PARCELA são calculados a partir de
datas e valores já guardados. Guardá-los criaria redundância e, pior, a possibilidade de o valor
armazenado ficar desatualizado — uma parcela continuar marcada como "em aberto" no dia seguinte ao
vencimento, por exemplo.</p>
<p><b>Os vínculos de auditoria ficam para o Modelo Lógico.</b> O sistema registra qual usuário
cancelou um contrato e qual autorizou uma negativação. Esses vínculos não descrevem o negócio da
loja, e sim a trilha de responsabilidade; para não poluir o diagrama conceitual, eles aparecem no
Modelo Lógico como as chaves estrangeiras <code>cancelado_por</code> e
<code>autorizado_por</code>.</p>

<h3>3.5 Atributos das entidades</h3>
<p>As figuras a seguir detalham os atributos de cada entidade. A bolinha preenchida marca o atributo
identificador; a elipse tracejada marca os atributos derivados, que são calculados na consulta e
não ocupam espaço no banco.</p>

${figAlta(A.figura2Motocicleta(), 'Figura 2 — Atributos da entidade MOTOCICLETA.')}
${figAlta(A.figura3Funcionario(), 'Figura 3 — Atributos da entidade FUNCIONÁRIO.')}
${figAlta(A.figura4ClienteNegociacao(), 'Figura 4 — Atributos das entidades CLIENTE e NEGOCIAÇÃO.')}
${figAlta(A.figura5ChamadoHistorico(), 'Figura 5 — Atributos das entidades CHAMADO e HISTÓRICO_ETAPA.')}
${figAlta(A.figura6ContratoParcela(), 'Figura 6 — Atributos das entidades CONTRATO e PARCELA.')}
${figAlta(A.figura7UsuarioCobranca(), 'Figura 7 — Atributos das entidades USUÁRIO e COBRANÇA.')}
${figAlta(A.figura8Apoio(), 'Figura 8 — Atributos das entidades FÉRIAS, LOG_ACESSO e PARÂMETRO.')}

<h2 class="quebra">4. Modelo Lógico</h2>
<p>O Modelo Lógico traduz o Modelo Conceitual para a estrutura de tabelas do modelo relacional:
cada entidade vira uma tabela, cada atributo vira uma coluna, o atributo identificador vira a chave
primária e os relacionamentos viram chaves estrangeiras.</p>

<h3>4.1 Regras de transformação aplicadas</h3>
${tabela(['Cardinalidade', 'Estratégia', 'Onde entrou a chave estrangeira', 'Casos neste projeto'], [
    ['1:N', 'Adição de coluna', 'Na tabela do lado N.',
      'A maioria: ferias, cliente, negociacao, negociacao_historico, contrato, parcela, cobranca e chamado recebem a FK.'],
    ['1:1 com um lado opcional', 'Adição de coluna', 'Na tabela do lado opcional.',
      'FUNCIONÁRIO–USUÁRIO: a coluna funcionario_id ficou em <code>usuario</code>. NEGOCIAÇÃO–CONTRATO e MOTOCICLETA–CONTRATO: as colunas ficaram em <code>contrato</code>.'],
    ['1:1 obrigatório dos dois lados', 'Fusão de tabelas', 'Não há FK: vira uma tabela só.',
      'Não ocorre neste projeto — nenhum relacionamento é obrigatório nos dois lados com máximo 1.'],
    ['N:N', 'Tabela própria', 'Tabela nova, com chave primária composta.',
      'Não ocorre neste projeto: os casos que seriam N:N já nascem com entidade própria (HISTÓRICO_ETAPA e COBRANÇA), porque têm atributos próprios.'],
  ])}
<p>Além disso, foi adotada uma decisão comum em implementação: todas as tabelas receberam uma
<b>chave primária artificial</b> (<code>id</code>, numérica e automática), e os identificadores do
modelo conceitual — <code>numero</code> do contrato, <code>codigo</code> da moto, <code>cpf</code>
do cliente — foram mantidos como <b>chaves alternativas</b> (restrição UNIQUE). A parcela, entidade
fraca, guarda a unicidade do par (<code>contrato_id</code>, <code>numero</code>).</p>

${figLarga(figuraLogico(), 'Figura 9 — Modelo Lógico (relacional) do sistema Marelo Motos.')}

<h3>4.2 Esquema relacional</h3>
<p>O mesmo modelo na notação textual, com a chave primária sublinhada e as chaves estrangeiras em
itálico:</p>
${esquemaTextual()}

<h3>4.3 Restrições de integridade</h3>
<ul>
  <li><b>Integridade de entidade:</b> toda tabela tem chave primária, que não aceita valor nulo nem
      repetido.</li>
  <li><b>Integridade referencial:</b> as vinte chaves estrangeiras do modelo só aceitam valores que
      existam na tabela referenciada. O banco foi criado com a verificação ativada
      (<code>PRAGMA foreign_keys = ON</code>).</li>
  <li><b>Integridade de domínio:</b> as colunas de situação aceitam apenas os valores previstos —
      a etapa da negociação só pode ser lead, contato, proposta, financiamento, fechada ou perdida;
      a parcela só pode estar aberta, paga ou cancelada; a moto só pode estar disponível, reservada,
      em preparação ou vendida.</li>
  <li><b>Chaves alternativas:</b> cpf do cliente, cpf do funcionário, e-mail do usuário, código da
      moto, número do contrato e número do chamado são únicos.</li>
</ul>

<h3>4.4 Implementação</h3>
<p>O modelo apresentado não ficou no papel: ele está implementado em <b>SQLite</b> no protótipo do
Projeto Integrador, com as treze tabelas, as vinte chaves estrangeiras, as restrições de domínio e
oito índices para as consultas mais frequentes. As regras de cálculo dos atributos derivados ficam
em <b>visões SQL</b> (<code>vw_estoque</code>, <code>vw_parcela</code>, <code>vw_chamado</code> e
<code>vw_comissao</code>), de modo que o mesmo cálculo valha para qualquer consulta, venha de onde
vier.</p>

<h2>5. Integrantes do grupo</h2>
${tabela(['Nome completo'], INTEGRANTES.map((n) => [n]))}
<p>Trabalho elaborado pelo mesmo grupo do Projeto Integrador em ADS II, a partir dos requisitos
levantados com o cliente e registrados na Documentação de Sistema do projeto.</p>

</body></html>`;
}

// ---------------------------------------------------------------- geracao

const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const navegador = NAVEGADORES.find((c) => existsSync(c));
if (!navegador) { console.error('  Chrome/Edge nao encontrado.'); process.exit(1); }

mkdirSync(dirname(DESTINO), { recursive: true });
const html = documento();
const temporario = join(tmpdir(), basename(DESTINO).replace(/\.pdf$/i, '.html'));
writeFileSync(temporario, html, 'utf8');

const browser = await puppeteer.launch({ executablePath: navegador, headless: 'new' });
const aba = await browser.newPage();
await aba.setContent(html, { waitUntil: 'load' });
await aba.pdf({
  path: DESTINO,
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%;font-family:Calibri,Arial,sans-serif;font-size:8pt;
     color:#6B6559;padding:0 18mm;display:flex;justify-content:space-between;">
     <span>Modelagem de Banco de Dados - Marelo Motos</span>
     <span class="pageNumber"></span></div>`,
});
await browser.close();

console.log('');
console.log('  PDF gerado: ' + DESTINO);
console.log('');
