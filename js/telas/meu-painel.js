// =====================================================================
//  Painel do funcionario
//  RNFR-07.2 — o vendedor consulta somente a propria comissao.
//  RNFR-06.1 — nao ha nenhum dado de folha de pagamento aqui.
// =====================================================================

import { api, dinheiro, numero, tabela, etiqueta, escapar, data } from '../nucleo.js';

export function abas() {
  return [{ id: 'geral', nome: 'Meu painel' }];
}

export async function montar(area, contexto) {
  const d = await api.ler('/api/meu-painel');
  const usuario = contexto.usuario;
  const percentualMeta = d.meta ? Math.round((d.vendas / d.meta) * 100) : null;

  // Cada funcionario ve o que pode fazer, segundo as permissoes que o
  // proprio servidor devolveu na sessao.
  const podeFazer = [
    ['Cadastrar cliente',            contexto.permissoes['comercial.escrever']],
    ['Consultar estoque',            contexto.permissoes['estoque.ler']],
    ['Movimentar o funil de vendas', contexto.permissoes['comercial.escrever']],
    ['Fechar venda e gerar contrato',contexto.permissoes['comercial.escrever']],
    ['Cadastrar moto no estoque',    contexto.permissoes['estoque.escrever']],
    ['Ver a folha de pagamento',     contexto.permissoes['folha.ler']],
    ['Ver o painel do proprietário', contexto.permissoes['painel.gerencial']],
  ];

  area.innerHTML = `
    <h1 class="titulo">Meu painel</h1>
    <p class="subtitulo">
      ${escapar(usuario.nome)} · ${escapar(usuario.cargo)}
      ${d.meta ? ` · meta do mês: ${d.meta} motos` : ''}
    </p>

    <div class="grade g4">
      <div class="card kpi">
        <div class="rotulo">Minhas vendas no mês</div>
        <div class="valor">${numero(d.vendas)}</div>
        <div class="delta">
          ${d.meta
            ? `Meta: ${d.meta} <span class="${percentualMeta >= 100 ? 'up' : ''}">(${percentualMeta}%)</span>`
            : 'sem meta definida'}
        </div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Minha comissão</div>
        <div class="valor">${dinheiro(d.comissao)}</div>
        <div class="delta">${d.percentual}% sobre ${numero(d.vendasComComissao)} venda(s) liberada(s)</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Negociações em aberto</div>
        <div class="valor">${numero(d.carteira?.abertas || 0)}</div>
        <div class="delta">de ${numero(d.carteira?.total || 0)} na minha carteira</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Próximas férias</div>
        <div class="valor" style="font-size:19px">
          ${d.ferias ? data(d.ferias.data_inicio) : '—'}
        </div>
        <div class="delta">${d.ferias ? `até ${data(d.ferias.data_fim)}` : 'nenhuma programada'}</div>
      </div>
    </div>

    ${d.vendas > d.vendasComComissao ? `
      <div class="aviso mt">
        Você tem ${d.vendas - d.vendasComComissao} venda(s) fechada(s) que ainda não entraram
        na comissão. A comissão é liberada quando a primeira parcela do contrato é quitada.
      </div>` : ''}

    <div class="grade g21 mt">
      <div class="card tabela">
        <h3>Minhas negociações em andamento</h3>
        ${tabela({
          colunas: [
            { titulo: 'Cliente', valor: (l) => escapar(l.cliente) },
            { titulo: 'Telefone', valor: (l) => escapar(l.telefone || '—') },
            { titulo: 'Moto', valor: (l) => escapar(l.modelo || 'a definir') },
            { titulo: 'Etapa', valor: (l) => etiqueta(l.etapa) },
            { titulo: 'Valor', alinha: 'direita', valor: (l) => dinheiro(l.valor_negociado) },
            { titulo: 'Atualizado', valor: (l) => data(l.atualizado) },
          ],
          linhas: d.agenda,
          vazio: 'Você não tem negociações em andamento.',
        })}
      </div>

      <div class="card">
        <h3>O que meu perfil permite</h3>
        <ul class="lista-simples">
          ${podeFazer.map(([texto, liberado]) => `
            <li>
              <span>${escapar(texto)}</span>
              <span class="tag ${liberado ? 't-ok' : 't-erro'}">${liberado ? 'Liberado' : 'Bloqueado'}</span>
            </li>`).join('')}
        </ul>
        <p style="font-size:11.5px;color:var(--texto-fraco);margin-top:14px;line-height:1.6">
          As permissões são definidas pelo proprietário e conferidas pelo
          servidor a cada operação.
        </p>
      </div>
    </div>`;
}
