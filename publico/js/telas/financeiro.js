// =====================================================================
//  Modulo Financeiro
//  RF-04 — contratos e boletos gerados na venda
//  RF-05 — inadimplencia e regua de cobranca
//  RNFR-04.3 — somente o Dono cancela contrato
//  RNFR-05.2 — a negativacao depende de autorizacao do proprietario
// =====================================================================

import {
  api, dinheiro, numero, tabela, etiqueta, escapar, data,
  janela, lerCampos, recado, confirmar,
} from '../nucleo.js';
import { recarregar } from '../app.js';

export function abas() {
  return [
    { id: 'resumo', nome: 'Resumo' },
    { id: 'contratos', nome: 'Contratos' },
    { id: 'cobranca', nome: 'Cobrança' },
  ];
}

export async function montar(area, contexto, aba) {
  if (aba === 'contratos') return montarContratos(area, contexto);
  if (aba === 'cobranca') return montarCobranca(area, contexto);
  return montarResumo(area, contexto);
}

// =====================================================================
//  RESUMO
// =====================================================================
async function montarResumo(area) {
  const [d, parcelas] = await Promise.all([
    api.ler('/api/financeiro/resumo'),
    api.ler('/api/parcelas?situacao=vencida'),
  ]);

  const porCliente = {};
  for (const p of parcelas) {
    porCliente[p.cliente_nome] ??= { nome: p.cliente_nome, telefone: p.cliente_telefone, valor: 0, parcelas: 0, atraso: 0 };
    porCliente[p.cliente_nome].valor += p.valor;
    porCliente[p.cliente_nome].parcelas += 1;
    porCliente[p.cliente_nome].atraso = Math.max(porCliente[p.cliente_nome].atraso, p.dias_atraso);
  }

  area.innerHTML = `
    <h1 class="titulo">Financeiro</h1>
    <p class="subtitulo">Contas a receber, contas a pagar e controle de inadimplência</p>

    <div class="grade g4">
      <div class="card kpi">
        <div class="rotulo">A receber</div>
        <div class="valor">${dinheiro(d.aReceber.valor)}</div>
        <div class="delta">${numero(d.aReceber.parcelas)} parcelas em aberto</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Recebido no mês</div>
        <div class="valor">${dinheiro(d.recebidoMes.valor)}</div>
        <div class="delta">parcelas quitadas</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Inadimplência</div>
        <div class="valor">${dinheiro(d.vencidas.valor)}</div>
        <div class="delta">
          ${d.vencidas.clientes
            ? `<span class="down">${d.vencidas.clientes} cliente(s), ${d.vencidas.parcelas} parcela(s)</span>`
            : '<span class="up">nenhum atraso</span>'}
        </div>
      </div>
      <div class="card kpi">
        <div class="rotulo">A pagar no mês</div>
        <div class="valor">${dinheiro(d.aPagar.folha + d.aPagar.comissoes)}</div>
        <div class="delta">folha + comissões</div>
      </div>
    </div>

    <div class="card tabela mt">
      <h3>Clientes em atraso</h3>
      ${tabela({
        colunas: [
          { titulo: 'Cliente', valor: (l) => escapar(l.nome) },
          { titulo: 'Telefone', valor: (l) => escapar(l.telefone || '—') },
          { titulo: 'Parcelas vencidas', alinha: 'direita', valor: (l) => numero(l.parcelas) },
          { titulo: 'Maior atraso', alinha: 'direita', valor: (l) => `${l.atraso} dias` },
          { titulo: 'Total devido', alinha: 'direita', valor: (l) => `<b>${dinheiro(l.valor)}</b>` },
        ],
        linhas: Object.values(porCliente).sort((a, b) => b.valor - a.valor),
        vazio: 'Nenhum cliente em atraso. ',
      })}
    </div>`;
}

// =====================================================================
//  CONTRATOS
// =====================================================================
async function montarContratos(area, contexto) {
  const contratos = await api.ler('/api/contratos');
  const podeCancelar = contexto.permissoes['contrato.cancelar'];

  area.innerHTML = `
    <h1 class="titulo">Contratos</h1>
    <p class="subtitulo">
      Gerados automaticamente no fechamento da venda, com numeração única e
      sequencial (RNFR-04.2).
    </p>

    <div class="barra-acoes">
      <input class="filtro" id="busca" placeholder="Número do contrato ou cliente…" style="min-width:280px">
      <span class="espaco"></span>
      <span style="font-size:12px;color:var(--texto-fraco)">${contratos.length} contrato(s)</span>
    </div>

    <div class="card tabela" id="lista"></div>`;

  const desenhar = (lista) => {
    document.getElementById('lista').innerHTML = tabela({
      colunas: [
        { titulo: 'Número', valor: (l) => escapar(l.numero) },
        { titulo: 'Emissão', valor: (l) => data(l.data_emissao) },
        { titulo: 'Cliente', valor: (l) => escapar(l.cliente_nome) },
        { titulo: 'Moto', valor: (l) => `${escapar(l.moto_codigo)} · ${escapar(l.modelo)}` },
        { titulo: 'Vendedor', valor: (l) => escapar(l.vendedor_nome) },
        { titulo: 'Condição', valor: (l) => etiqueta(l.forma_pagamento) },
        { titulo: 'Parcelas', alinha: 'direita', valor: (l) => `${l.parcelas_pagas}/${l.total_parcelas}` },
        { titulo: 'Valor', alinha: 'direita', valor: (l) => dinheiro(l.valor_total) },
        { titulo: 'Situação', valor: (l) => etiqueta(l.situacao) },
        { titulo: '', valor: (l) => `<button class="btn pequeno linha" data-ver="${l.id}">Abrir</button>` },
      ],
      linhas: lista,
      vazio: 'Nenhum contrato emitido.',
    });

    for (const botao of document.querySelectorAll('[data-ver]')) {
      botao.addEventListener('click', () => abrirContrato(botao.dataset.ver, podeCancelar, contexto));
    }
  };
  desenhar(contratos);

  document.getElementById('busca').addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    desenhar(contratos.filter((c) =>
      c.numero.toLowerCase().includes(termo) ||
      c.cliente_nome.toLowerCase().includes(termo)));
  });
}

async function abrirContrato(id, podeCancelar, contexto) {
  const c = await api.ler(`/api/contratos/${id}`);
  const podeBaixar = contexto.permissoes['financeiro.escrever'];

  const acoes = [];
  if (c.situacao !== 'cancelado' && podeCancelar) {
    acoes.push({
      texto: 'Cancelar contrato',
      estilo: 'perigo',
      aoClicar: async ({ fechar }) => {
        fechar();
        abrirCancelamento(c);
        return 'manter';
      },
    });
  }
  acoes.push({ texto: 'Fechar', estilo: 'linha' });

  const { fundo } = janela({
    titulo: `Contrato ${c.numero}`,
    descricao: `${c.cliente_nome} · CPF ${c.cpf} · emitido em ${data(c.data_emissao)}`,
    largo: true,
    corpo: `
      ${c.situacao === 'cancelado' ? `
        <div class="aviso erro">
          Contrato cancelado. Motivo: ${escapar(c.motivo_cancelamento || 'não informado')}
        </div>` : ''}

      <div class="grade g2">
        <div>
          <h3 style="font-size:12px;color:var(--texto-fraco);text-transform:uppercase;margin-bottom:12px">Veículo</h3>
          <ul class="lista-simples">
            <li><span>Código</span><b>${escapar(c.moto_codigo)}</b></li>
            <li><span>Modelo</span><b>${escapar(c.marca)} ${escapar(c.modelo)}</b></li>
            <li><span>Ano / cor</span><b>${escapar(c.ano)} · ${escapar(c.cor || '—')}</b></li>
            <li><span>Placa</span><b>${escapar(c.placa || '—')}</b></li>
          </ul>
        </div>
        <div>
          <h3 style="font-size:12px;color:var(--texto-fraco);text-transform:uppercase;margin-bottom:12px">Condição</h3>
          <ul class="lista-simples">
            <li><span>Forma de pagamento</span>${etiqueta(c.forma_pagamento)}</li>
            <li><span>Valor total</span><b>${dinheiro(c.valor_total)}</b></li>
            <li><span>Entrada</span><b>${dinheiro(c.valor_entrada)}</b></li>
            <li><span>Parcelas</span><b>${c.qtd_parcelas}x</b></li>
            ${c.banco ? `<li><span>Banco</span><b>${escapar(c.banco)}</b></li>` : ''}
            <li><span>Vendedor</span><b>${escapar(c.vendedor_nome)}</b></li>
          </ul>
        </div>
      </div>

      <h3 style="font-size:12px;color:var(--texto-fraco);text-transform:uppercase;margin:22px 0 12px">
        Boletos / parcelas
      </h3>
      <div style="max-height:320px;overflow-y:auto">
        ${tabela({
          colunas: [
            { titulo: 'Nº', valor: (l) => l.numero },
            { titulo: 'Vencimento', valor: (l) => data(l.vencimento) },
            { titulo: 'Valor', alinha: 'direita', valor: (l) => dinheiro(l.valor) },
            { titulo: 'Pagamento', valor: (l) => data(l.data_pagamento) },
            { titulo: 'Situação', valor: (l) => etiqueta(l.situacao_real) },
            {
              titulo: '',
              valor: (l) => (podeBaixar && l.situacao === 'aberta'
                ? `<button class="btn pequeno" data-baixar="${l.id}">Dar baixa</button>` : ''),
            },
          ],
          linhas: c.parcelas,
          vazio: 'Sem parcelas.',
        })}
      </div>`,
    acoes,
  });

  for (const botao of fundo.querySelectorAll('[data-baixar]')) {
    botao.addEventListener('click', async () => {
      const r = await api.criar(`/api/parcelas/${botao.dataset.baixar}/baixar`, {});
      recado(r.contratoQuitado ? 'Parcela quitada. Contrato totalmente quitado!' : 'Parcela quitada.');
      recarregar();
    });
  }
}

function abrirCancelamento(c) {
  janela({
    titulo: `Cancelar o contrato ${c.numero}?`,
    descricao: 'Somente o proprietário pode cancelar um contrato já emitido (RNFR-04.3).',
    corpo: `
      <div class="aviso erro">
        Ao cancelar: as parcelas ainda não pagas são canceladas e a moto
        <b>${escapar(c.moto_codigo)}</b> volta para o pátio como disponível.
        As parcelas já quitadas continuam registradas.
      </div>
      <div class="campo">
        <label for="motivo">Motivo do cancelamento</label>
        <textarea name="motivo" id="motivo" rows="3" placeholder="Ex.: crédito negado pelo banco após a emissão"></textarea>
      </div>`,
    acoes: [
      { texto: 'Voltar', estilo: 'linha' },
      {
        texto: 'Confirmar cancelamento',
        estilo: 'perigo',
        aoClicar: async ({ fundo }) => {
          await api.criar(`/api/contratos/${c.id}/cancelar`, lerCampos(fundo));
          recado('Contrato cancelado e moto devolvida ao pátio.');
          recarregar();
        },
      },
    ],
  });
}

// =====================================================================
//  RF-05 — REGUA DE COBRANCA
// =====================================================================
const NOMES_ACAO = {
  'enviar lembrete': ['Enviar lembrete', 't-info', 'lembrete'],
  'enviar segunda via': ['Enviar 2ª via', 't-alerta', 'segunda_via'],
  'contato do financeiro': ['Contato do financeiro', 't-alerta', 'contato'],
  'propor negativacao': ['Propor negativação', 't-erro', 'negativacao'],
  'em dia': ['Em dia', 't-ok', null],
};

async function montarCobranca(area, contexto) {
  const parcelas = await api.ler('/api/cobranca');
  const podeAgir = contexto.permissoes['financeiro.escrever'];
  const podeNegativar = contexto.permissoes['negativacao'];

  const emAtraso = parcelas.filter((p) => p.dias_atraso > 0);
  const total = emAtraso.reduce((s, p) => s + p.valor, 0);

  area.innerHTML = `
    <h1 class="titulo">Régua de cobrança</h1>
    <p class="subtitulo">
      Só aparecem aqui as parcelas que exigem ação: as já vencidas e as que
      estão a poucos dias do vencimento. Os prazos (lembrete 3 dias antes,
      2ª via após 1 dia, contato aos 7 e negativação aos 15 dias de atraso)
      são configuráveis pelo proprietário.
    </p>

    <div class="grade g3">
      <div class="card kpi">
        <div class="rotulo">Total em atraso</div>
        <div class="valor">${dinheiro(total)}</div>
        <div class="delta">${emAtraso.length} parcela(s)</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Vencem nos próximos dias</div>
        <div class="valor">${numero(parcelas.length - emAtraso.length)}</div>
        <div class="delta">dentro do prazo do lembrete</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Passíveis de negativação</div>
        <div class="valor">${numero(parcelas.filter((p) => p.acao_sugerida === 'propor negativacao').length)}</div>
        <div class="delta">${podeNegativar ? 'você pode autorizar' : 'depende do proprietário'}</div>
      </div>
    </div>

    ${!podeNegativar ? `
      <div class="aviso mt">
        A negativação de clientes depende de autorização expressa do
        proprietário (RNFR-05.2). As demais ações da régua estão liberadas.
      </div>` : ''}

    <div class="card tabela mt">
      ${tabela({
        colunas: [
          { titulo: 'Cliente', valor: (l) => escapar(l.cliente_nome) },
          { titulo: 'Contrato', valor: (l) => escapar(l.contrato_numero) },
          { titulo: 'Parcela', valor: (l) => `${l.numero}` },
          { titulo: 'Vencimento', valor: (l) => data(l.vencimento) },
          { titulo: 'Atraso', alinha: 'direita',
            valor: (l) => (l.dias_atraso > 0 ? `<b class="down">${l.dias_atraso} dias</b>` : '—') },
          { titulo: 'Valor', alinha: 'direita', valor: (l) => dinheiro(l.valor) },
          { titulo: 'Já enviado', valor: (l) =>
            (l.cobrancas.length
              ? l.cobrancas.map((c) => `<span class="tag t-neutro">${escapar(c.tipo.replace('_', ' '))}</span>`).join(' ')
              : '<span style="color:var(--texto-fraco)">nada ainda</span>') },
          { titulo: 'Ação prevista', valor: (l) => {
              const [texto, classe] = NOMES_ACAO[l.acao_sugerida] || [l.acao_sugerida, 't-neutro'];
              return `<span class="tag ${classe}">${escapar(texto)}</span>`;
            } },
          { titulo: '', valor: (l) => {
              if (!podeAgir) return '';
              const tipo = (NOMES_ACAO[l.acao_sugerida] || [])[2];
              if (!tipo) return '';
              if (tipo === 'negativacao' && !podeNegativar) {
                return '<span class="tag t-erro">requer o dono</span>';
              }
              return `<button class="btn pequeno linha" data-acao="${tipo}" data-parcela="${l.id}">Registrar</button>`;
            } },
        ],
        linhas: parcelas.map((p) => ({ ...p, __destaque: p.dias_atraso >= 15 })),
        vazio: 'Nenhuma parcela em aberto. ',
      })}
    </div>`;

  for (const botao of area.querySelectorAll('[data-acao]')) {
    botao.addEventListener('click', async () => {
      const tipo = botao.dataset.acao;
      if (tipo === 'negativacao') {
        const ok = await confirmar(
          'Autorizar a negativação deste cliente?',
          'A ação fica registrada com o seu nome como autorizador.');
        if (!ok) return;
      }
      await api.criar('/api/cobranca', { parcelaId: Number(botao.dataset.parcela), tipo });
      recado('Ação de cobrança registrada.');
      recarregar();
    });
  }
}
