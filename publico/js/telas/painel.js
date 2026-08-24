// =====================================================================
//  RF-08 — Painel gerencial do proprietario
//  Todos os indicadores vem prontos do servidor, calculados a partir
//  dos modulos Comercial, Estoque, Financeiro e RH (RNFR-08.1).
// =====================================================================

import {
  api, dinheiro, dinheiroCurto, numero, tabela, escapar, mesPorExtenso,
} from '../nucleo.js';

export function abas() {
  return [{ id: 'geral', nome: 'Visão geral' }];
}

export async function montar(area) {
  const d = await api.ler('/api/painel');

  const variacao = (atual, anterior) => {
    if (!anterior) return '<span class="delta">sem base de comparação</span>';
    const p = Math.round(((atual - anterior) / anterior) * 100);
    const classe = p >= 0 ? 'up' : 'down';
    const seta = p >= 0 ? '▲' : '▼';
    return `<span class="${classe}">${seta} ${Math.abs(p)}%</span> vs. mês anterior`;
  };

  const maior = Math.max(...d.historico.map((h) => h.faturamento), 1);
  const barras = d.historico.map((h) => `
    <div class="barra">
      <div class="vl">${dinheiroCurto(h.faturamento)}</div>
      <div class="cor" style="height:${Math.max(3, (h.faturamento / maior) * 100)}%"></div>
      <div class="lb">${mesPorExtenso(h.competencia).split(' de ')[0].slice(0, 3)}</div>
    </div>`).join('');

  const alertas = d.alertas.length
    ? d.alertas.map((a) => `
        <li>
          <span>${escapar(a.texto)}</span>
          <span class="tag ${a.nivel === 'erro' ? 't-erro' : a.nivel === 'info' ? 't-info' : 't-alerta'}">${escapar(a.modulo)}</span>
        </li>`).join('')
    : '<li><span>Nenhum alerta hoje.</span><span class="tag t-ok">Tudo em dia</span></li>';

  const r = d.resumoFinanceiro;

  area.innerHTML = `
    <h1 class="titulo">Visão geral da loja</h1>
    <p class="subtitulo">
      ${mesPorExtenso(new Date().toISOString().slice(0, 7))} ·
      dados consolidados de Comercial, Estoque, Financeiro e RH
    </p>

    <div class="grade g4">
      <div class="card kpi">
        <div class="rotulo">Faturamento do mês</div>
        <div class="valor">${dinheiro(d.mes.faturamento)}</div>
        <div class="delta">${variacao(d.mes.faturamento, d.mesAnterior.faturamento)}</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Motos vendidas</div>
        <div class="valor">${numero(d.mes.vendas)}</div>
        <div class="delta">${variacao(d.mes.vendas, d.mesAnterior.vendas)}</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Motos no pátio</div>
        <div class="valor">${numero(d.estoque.total)}</div>
        <div class="delta">${dinheiroCurto(d.estoque.imobilizado)} imobilizados</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Inadimplência</div>
        <div class="valor">${dinheiro(d.inadimplencia.valor)}</div>
        <div class="delta">
          ${d.inadimplencia.clientes
            ? `<span class="down">${d.inadimplencia.clientes} cliente(s) em atraso</span>`
            : '<span class="up">nenhum cliente em atraso</span>'}
        </div>
      </div>
    </div>

    <div class="grade g21 mt">
      <div class="card">
        <h3>Faturamento dos últimos meses</h3>
        <div class="barras">${barras || '<p class="vazio">Ainda não há vendas registradas.</p>'}</div>
      </div>
      <div class="card">
        <h3>Alertas do dia</h3>
        <ul class="lista-simples">${alertas}</ul>
      </div>
    </div>

    <div class="grade g2 mt">
      <div class="card tabela">
        <h3>Ranking de vendedores — ${mesPorExtenso(new Date().toISOString().slice(0, 7))}</h3>
        ${tabela({
          colunas: [
            { titulo: 'Vendedor', valor: (l) => escapar(l.vendedor_nome) },
            { titulo: 'Vendas', alinha: 'direita', valor: (l) => numero(l.vendas) },
            { titulo: 'Faturamento', alinha: 'direita', valor: (l) => dinheiro(l.faturamento) },
            { titulo: 'Comissão', alinha: 'direita', valor: (l) => dinheiro(l.comissao) },
          ],
          linhas: d.ranking,
          vazio: 'Nenhuma venda com a primeira parcela quitada neste mês.',
        })}
      </div>

      <div class="card">
        <h3>Resumo financeiro do mês</h3>
        <ul class="lista-simples">
          <li><span>Entradas (vendas do mês)</span><b>${dinheiro(r.entradas)}</b></li>
          <li><span>Compra de veículos</span><b>${dinheiro(r.compraVeiculos)}</b></li>
          <li><span>Folha de pagamento</span><b>${dinheiro(r.folha)}</b></li>
          <li><span>Comissões dos vendedores</span><b>${dinheiro(r.comissoes)}</b></li>
          <li>
            <span><b>Resultado</b></span>
            <b class="${r.resultado >= 0 ? 'up' : 'down'}">${dinheiro(r.resultado)}</b>
          </li>
        </ul>
        <p style="font-size:11.5px;color:var(--texto-fraco);margin-top:14px;line-height:1.6">
          O resultado considera apenas o que já está registrado no sistema.
          Despesas fixas da loja (aluguel, energia, impostos) ainda não fazem
          parte do escopo — item a confirmar com o cliente.
        </p>
      </div>
    </div>

    <div class="grade g3 mt">
      <div class="card kpi">
        <div class="rotulo">A receber (todas as parcelas em aberto)</div>
        <div class="valor">${dinheiro(d.aReceber.valor)}</div>
        <div class="delta">${numero(d.aReceber.parcelas)} parcelas</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Motos paradas há mais de 90 dias</div>
        <div class="valor">${numero(d.estoque.paradas)}</div>
        <div class="delta">${d.estoque.paradas ? 'avaliar promoção' : 'nenhuma'}</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Reservadas / em preparação</div>
        <div class="valor">${numero(d.estoque.reservadas)} / ${numero(d.estoque.preparacao)}</div>
        <div class="delta">aguardando financiamento e oficina</div>
      </div>
    </div>`;
}
