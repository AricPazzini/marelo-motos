// =====================================================================
//  API do sistema (JSON sobre HTTP)
//
//  Cada rota declara a permissao que exige. Quem nao tem a permissao
//  recebe 403 e a operacao nao acontece — mesmo que a tela do usuario
//  tenha sido alterada no navegador.
// =====================================================================

import { todos, um, executar, parametro, gerarBackup } from './banco.js';
import { pode, permissoesDe, entrar, sair, usuarioDaSessao } from './auth.js';
import {
  cpfValido, formatarCpf, telefoneValido,
  fecharVenda, reguaDeCobranca, proximoNumeroChamado, ErroDeRegra,
} from './regras.js';

const rotas = [];

function rota(metodo, padrao, permissao, manipulador) {
  // "/api/clientes/:id" vira uma expressao regular com grupo nomeado
  const regex = new RegExp(
    '^' + padrao.replace(/:[a-zA-Z]+/g, '([^/]+)') + '$'
  );
  rotas.push({ metodo, regex, permissao, manipulador });
}

export function encontrarRota(metodo, caminho) {
  for (const r of rotas) {
    if (r.metodo !== metodo) continue;
    const casou = r.regex.exec(caminho);
    if (casou) return { ...r, params: casou.slice(1) };
  }
  return null;
}

export { pode, permissoesDe, entrar, sair, usuarioDaSessao };

// =====================================================================
//  SESSAO
// =====================================================================
rota('POST', '/api/login', null, ({ corpo }) => {
  const sessao = entrar(corpo.email, corpo.senha);
  if (!sessao) throw new ErroDeRegra('E-mail ou senha invalidos.');
  return sessao;
});

rota('POST', '/api/sair', 'livre', ({ token }) => {
  sair(token);
  return { ok: true };
});

rota('GET', '/api/sessao', 'livre', ({ usuario }) => ({
  usuario,
  permissoes: permissoesDe(usuario),
  loja: {
    nome: parametro('loja_nome', 'Marelo Motos'),
    cidade: parametro('loja_cidade', ''),
  },
}));

// =====================================================================
//  RF-08 — PAINEL GERENCIAL DO PROPRIETARIO
//  Todos os numeros sao calculados a partir dos demais modulos, sem
//  nenhuma digitacao manual (RNFR-08.1).
// =====================================================================
rota('GET', '/api/painel', 'painel.gerencial', () => {
  const mes = um(`
    SELECT
      COUNT(*)                        AS vendas,
      COALESCE(SUM(valor_total), 0)   AS faturamento
    FROM contrato
    WHERE situacao <> 'cancelado'
      AND strftime('%Y-%m', data_emissao) = strftime('%Y-%m', date('now','localtime'))`);

  const mesAnterior = um(`
    SELECT
      COUNT(*)                        AS vendas,
      COALESCE(SUM(valor_total), 0)   AS faturamento
    FROM contrato
    WHERE situacao <> 'cancelado'
      AND strftime('%Y-%m', data_emissao) = strftime('%Y-%m', date('now','localtime','-1 month'))`);

  const estoque = um(`
    SELECT
      COUNT(*)                                   AS total,
      COALESCE(SUM(custo), 0)                    AS imobilizado,
      SUM(CASE WHEN situacao = 'reservada'  THEN 1 ELSE 0 END) AS reservadas,
      SUM(CASE WHEN situacao = 'preparacao' THEN 1 ELSE 0 END) AS preparacao,
      SUM(parada_90_dias)                        AS paradas
    FROM vw_estoque
    WHERE situacao <> 'vendida'`);

  const inadimplencia = um(`
    SELECT
      COALESCE(SUM(valor), 0)          AS valor,
      COUNT(DISTINCT cliente_id)       AS clientes,
      COUNT(*)                         AS parcelas
    FROM vw_parcela
    WHERE situacao_real = 'vencida'`);

  const aReceber = um(`
    SELECT COALESCE(SUM(valor), 0) AS valor, COUNT(*) AS parcelas
    FROM vw_parcela
    WHERE situacao_real IN ('aberta','vencida')`);

  const historico = todos(`
    SELECT strftime('%Y-%m', data_emissao)   AS competencia,
           COUNT(*)                          AS vendas,
           COALESCE(SUM(valor_total), 0)     AS faturamento
    FROM contrato
    WHERE situacao <> 'cancelado'
      AND data_emissao >= date('now','localtime','-6 months')
    GROUP BY competencia
    ORDER BY competencia`);

  const ranking = todos(`
    SELECT vendedor_nome, vendas, faturamento, comissao, percentual_comissao
    FROM vw_comissao
    WHERE competencia = strftime('%Y-%m', date('now','localtime'))
    ORDER BY faturamento DESC`);

  const folha = um(`
    SELECT COALESCE(SUM(salario), 0) AS total FROM funcionario WHERE situacao <> 'desligado'`);

  const custoVeiculos = um(`
    SELECT COALESCE(SUM(m.custo), 0) AS total
    FROM moto m
    WHERE strftime('%Y-%m', m.data_entrada) = strftime('%Y-%m', date('now','localtime'))`);

  const comissaoMes = um(`
    SELECT COALESCE(SUM(comissao), 0) AS total FROM vw_comissao
    WHERE competencia = strftime('%Y-%m', date('now','localtime'))`);

  // Alertas do dia: cada um aponta para o modulo de origem
  const alertas = [];
  const vencidas = inadimplencia.parcelas || 0;
  if (vencidas > 0) alertas.push({ texto: `${vencidas} parcela(s) vencida(s)`, modulo: 'Financeiro', nivel: 'erro' });
  if (estoque.paradas > 0) alertas.push({ texto: `${estoque.paradas} moto(s) há mais de 90 dias no pátio`, modulo: 'Estoque', nivel: 'alerta' });

  const chamadosAtrasados = um(`SELECT COUNT(*) AS total FROM vw_chamado WHERE situacao_real = 'atrasado'`);
  if (chamadosAtrasados.total > 0) alertas.push({ texto: `${chamadosAtrasados.total} chamado(s) de SAC atrasado(s)`, modulo: 'Comercial', nivel: 'erro' });

  const feriasProximas = todos(`
    SELECT f.nome, fe.data_inicio,
           CAST(julianday(fe.data_inicio) - julianday(date('now','localtime')) AS INTEGER) AS faltam
    FROM ferias fe JOIN funcionario f ON f.id = fe.funcionario_id
    WHERE fe.situacao = 'programada'
      AND julianday(fe.data_inicio) - julianday(date('now','localtime')) BETWEEN 0 AND 30`);
  for (const fe of feriasProximas) {
    alertas.push({ texto: `Férias de ${fe.nome} em ${fe.faltam} dias`, modulo: 'RH', nivel: 'info' });
  }

  const leadsParados = um(`
    SELECT COUNT(*) AS total FROM negociacao
    WHERE etapa IN ('lead','contato')
      AND julianday(date('now','localtime')) - julianday(date(atualizado_em)) >= 3`);
  if (leadsParados.total > 0) {
    alertas.push({ texto: `${leadsParados.total} lead(s) sem contato há 3 dias ou mais`, modulo: 'Comercial', nivel: 'alerta' });
  }

  return {
    mes, mesAnterior, estoque, inadimplencia, aReceber,
    historico, ranking, alertas,
    resumoFinanceiro: {
      entradas: mes.faturamento,
      compraVeiculos: custoVeiculos.total,
      folha: folha.total,
      comissoes: comissaoMes.total,
      resultado: mes.faturamento - custoVeiculos.total - folha.total - comissaoMes.total,
    },
  };
});

// =====================================================================
//  PAINEL DO FUNCIONARIO
//  RNFR-07.2 — o vendedor consulta somente a propria comissao.
// =====================================================================
rota('GET', '/api/meu-painel', 'livre', ({ usuario }) => {
  const id = usuario.funcionarioId;

  const comissao = um(`
    SELECT vendas, faturamento, comissao FROM vw_comissao
    WHERE vendedor_id = ? AND competencia = strftime('%Y-%m', date('now','localtime'))`, id)
    || { vendas: 0, faturamento: 0, comissao: 0 };

  const vendasMes = um(`
    SELECT COUNT(*) AS total FROM contrato
    WHERE vendedor_id = ? AND situacao <> 'cancelado'
      AND strftime('%Y-%m', data_emissao) = strftime('%Y-%m', date('now','localtime'))`, id);

  const carteira = um(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN etapa IN ('lead','contato','proposta','financiamento') THEN 1 ELSE 0 END) AS abertas
    FROM negociacao WHERE vendedor_id = ?`, id);

  const agenda = todos(`
    SELECT n.id, c.nome AS cliente, c.telefone, m.modelo, n.etapa, n.valor_negociado,
           date(n.atualizado_em) AS atualizado
    FROM negociacao n
    JOIN cliente c ON c.id = n.cliente_id
    LEFT JOIN moto m ON m.id = n.moto_id
    WHERE n.vendedor_id = ? AND n.etapa NOT IN ('fechada','perdida')
    ORDER BY n.atualizado_em DESC LIMIT 10`, id);

  const ferias = um(`
    SELECT data_inicio, data_fim FROM ferias
    WHERE funcionario_id = ? AND situacao = 'programada'
    ORDER BY data_inicio LIMIT 1`, id);

  return {
    vendas: vendasMes.total,
    meta: usuario.metaMensal,
    comissao: comissao.comissao || 0,
    faturamento: comissao.faturamento || 0,
    vendasComComissao: comissao.vendas || 0,
    carteira,
    agenda,
    ferias,
    percentual: usuario.percentualComissao,
  };
});

// =====================================================================
//  RF-01 — CLIENTES E FUNIL DE VENDAS
// =====================================================================

// RNFR-01.1: cada vendedor visualiza somente os clientes da sua carteira.
function filtroCarteira(usuario, coluna = 'vendedor_id') {
  if (pode(usuario, 'painel.gerencial')) return { sql: '', params: [] };
  if (usuario.setor === 'comercial') return { sql: ` AND ${coluna} = ?`, params: [usuario.funcionarioId] };
  return { sql: '', params: [] };
}

rota('GET', '/api/clientes', 'comercial.ler', ({ usuario, query }) => {
  const carteira = filtroCarteira(usuario, 'c.vendedor_id');
  const busca = query.busca ? `%${query.busca}%` : null;
  return todos(
    `SELECT c.*, f.nome AS vendedor_nome,
            (SELECT COUNT(*) FROM negociacao n WHERE n.cliente_id = c.id) AS negociacoes,
            (SELECT COUNT(*) FROM contrato ct WHERE ct.cliente_id = c.id AND ct.situacao <> 'cancelado') AS compras
       FROM cliente c
       LEFT JOIN funcionario f ON f.id = c.vendedor_id
      WHERE 1 = 1 ${carteira.sql}
        AND (? IS NULL OR c.nome LIKE ? OR c.cpf LIKE ? OR c.telefone LIKE ?)
      ORDER BY c.nome`,
    ...carteira.params, busca, busca, busca, busca
  );
});

rota('POST', '/api/clientes', 'comercial.escrever', ({ corpo, usuario }) => {
  const nome = String(corpo.nome || '').trim();
  if (nome.length < 3) throw new ErroDeRegra('Informe o nome completo do cliente.');
  if (!cpfValido(corpo.cpf)) throw new ErroDeRegra('CPF invalido. Confira os numeros digitados.');
  if (!telefoneValido(corpo.telefone)) throw new ErroDeRegra('Informe um telefone com DDD.');

  const cpf = formatarCpf(corpo.cpf);
  if (um('SELECT id FROM cliente WHERE cpf = ?', cpf)) {
    throw new ErroDeRegra('Ja existe um cliente cadastrado com este CPF.');
  }

  // o vendedor cadastra sempre na propria carteira; o dono escolhe
  const vendedorId = pode(usuario, 'painel.gerencial')
    ? (corpo.vendedorId || usuario.funcionarioId)
    : usuario.funcionarioId;

  const r = executar(
    `INSERT INTO cliente (nome, cpf, telefone, email, cidade, origem, vendedor_id, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    nome, cpf, corpo.telefone, corpo.email || null, corpo.cidade || null,
    corpo.origem || 'Loja', vendedorId, corpo.observacao || null
  );
  return { id: Number(r.lastInsertRowid) };
});

rota('PUT', '/api/clientes/:id', 'comercial.escrever', ({ params, corpo }) => {
  if (corpo.cpf && !cpfValido(corpo.cpf)) throw new ErroDeRegra('CPF invalido.');
  if (corpo.telefone && !telefoneValido(corpo.telefone)) throw new ErroDeRegra('Telefone invalido.');
  executar(
    `UPDATE cliente SET nome = ?, telefone = ?, email = ?, cidade = ?, origem = ?, observacao = ?
      WHERE id = ?`,
    corpo.nome, corpo.telefone, corpo.email || null, corpo.cidade || null,
    corpo.origem || null, corpo.observacao || null, params[0]
  );
  return { ok: true };
});

rota('GET', '/api/funil', 'comercial.ler', ({ usuario }) => {
  const carteira = filtroCarteira(usuario, 'n.vendedor_id');
  const negociacoes = todos(
    `SELECT n.*, c.nome AS cliente_nome, c.telefone, c.origem,
            m.codigo AS moto_codigo, m.marca, m.modelo, m.preco_venda,
            f.nome AS vendedor_nome
       FROM negociacao n
       JOIN cliente c ON c.id = n.cliente_id
       LEFT JOIN moto m ON m.id = n.moto_id
       JOIN funcionario f ON f.id = n.vendedor_id
      WHERE n.etapa <> 'perdida' ${carteira.sql}
      ORDER BY n.atualizado_em DESC`,
    ...carteira.params
  );

  const etapas = ['lead', 'contato', 'proposta', 'financiamento'];
  const colunas = etapas.map((etapa) => {
    const itens = negociacoes.filter((n) => n.etapa === etapa);
    return {
      etapa,
      quantidade: itens.length,
      valor: itens.reduce((soma, n) => soma + n.valor_negociado, 0),
      itens,
    };
  });

  // A ultima coluna mostra o que virou venda no mes corrente: vem dos
  // contratos emitidos, e nao das negociacoes, para que apareca tambem
  // a venda de balcao registrada direto no Financeiro.
  const carteiraContrato = filtroCarteira(usuario, 'c.vendedor_id');
  const fechadas = todos(
    `SELECT c.id, c.numero, c.valor_total AS valor_negociado, c.forma_pagamento,
            c.qtd_parcelas, cl.nome AS cliente_nome, m.codigo AS moto_codigo,
            m.marca, m.modelo, f.nome AS vendedor_nome
       FROM contrato c
       JOIN cliente cl ON cl.id = c.cliente_id
       JOIN moto m ON m.id = c.moto_id
       JOIN funcionario f ON f.id = c.vendedor_id
      WHERE c.situacao <> 'cancelado'
        AND strftime('%Y-%m', c.data_emissao) = strftime('%Y-%m', date('now','localtime'))
        ${carteiraContrato.sql}
      ORDER BY c.data_emissao DESC`,
    ...carteiraContrato.params
  );

  colunas.push({
    etapa: 'fechada',
    quantidade: fechadas.length,
    valor: fechadas.reduce((soma, c) => soma + c.valor_negociado, 0),
    itens: fechadas,
  });

  return { colunas };
});

rota('POST', '/api/negociacoes', 'comercial.escrever', ({ corpo, usuario }) => {
  if (!corpo.clienteId) throw new ErroDeRegra('Selecione o cliente.');
  const vendedorId = pode(usuario, 'painel.gerencial')
    ? (corpo.vendedorId || usuario.funcionarioId)
    : usuario.funcionarioId;

  const moto = corpo.motoId ? um('SELECT * FROM moto WHERE id = ?', corpo.motoId) : null;
  const valor = Number(corpo.valorNegociado) || (moto ? moto.preco_venda : 0);

  const r = executar(
    `INSERT INTO negociacao (cliente_id, moto_id, vendedor_id, etapa, valor_negociado)
     VALUES (?, ?, ?, 'lead', ?)`,
    corpo.clienteId, corpo.motoId || null, vendedorId, valor
  );
  const id = Number(r.lastInsertRowid);
  executar(
    `INSERT INTO negociacao_historico (negociacao_id, etapa_de, etapa_para, usuario_id, responsavel)
     VALUES (?, NULL, 'lead', ?, ?)`,
    id, usuario.id, usuario.nome
  );
  return { id };
});

// RF-01: cada mudanca de etapa fica registrada com data e responsavel.
rota('PUT', '/api/negociacoes/:id/etapa', 'comercial.escrever', ({ params, corpo, usuario }) => {
  const etapasValidas = ['lead', 'contato', 'proposta', 'financiamento', 'perdida'];
  if (!etapasValidas.includes(corpo.etapa)) {
    throw new ErroDeRegra('Para a etapa "venda fechada" use o fechamento da venda, que gera o contrato.');
  }
  const atual = um('SELECT * FROM negociacao WHERE id = ?', params[0]);
  if (!atual) throw new ErroDeRegra('Negociacao nao encontrada.');
  if (atual.etapa === 'fechada') throw new ErroDeRegra('Negociacao ja fechada nao volta de etapa.');

  executar(
    `UPDATE negociacao SET etapa = ?, motivo_perda = ?, atualizado_em = datetime('now','localtime')
      WHERE id = ?`,
    corpo.etapa, corpo.etapa === 'perdida' ? (corpo.motivo || 'Nao informado') : null, params[0]
  );
  executar(
    `INSERT INTO negociacao_historico (negociacao_id, etapa_de, etapa_para, usuario_id, responsavel)
     VALUES (?, ?, ?, ?, ?)`,
    params[0], atual.etapa, corpo.etapa, usuario.id, usuario.nome
  );
  return { ok: true };
});

rota('GET', '/api/negociacoes/:id', 'comercial.ler', ({ params }) => {
  const negociacao = um(
    `SELECT n.*, c.nome AS cliente_nome, c.cpf, c.telefone,
            m.codigo AS moto_codigo, m.marca, m.modelo, m.preco_venda, m.ano, m.cor,
            f.nome AS vendedor_nome
       FROM negociacao n
       JOIN cliente c ON c.id = n.cliente_id
       LEFT JOIN moto m ON m.id = n.moto_id
       JOIN funcionario f ON f.id = n.vendedor_id
      WHERE n.id = ?`, params[0]);
  if (!negociacao) throw new ErroDeRegra('Negociacao nao encontrada.');
  negociacao.historico = todos(
    'SELECT * FROM negociacao_historico WHERE negociacao_id = ? ORDER BY momento', params[0]);
  return negociacao;
});

// RF-04 — fechamento da venda
rota('POST', '/api/negociacoes/:id/fechar', 'comercial.escrever', ({ params, corpo, usuario }) =>
  fecharVenda({ ...corpo, negociacaoId: Number(params[0]) }, usuario)
);

// =====================================================================
//  RF-02 — SAC
// =====================================================================
rota('GET', '/api/chamados', 'sac.ler', () =>
  todos('SELECT * FROM vw_chamado ORDER BY CASE situacao_real WHEN \'atrasado\' THEN 0 WHEN \'andamento\' THEN 1 ELSE 2 END, data_abertura DESC')
);

rota('POST', '/api/chamados', 'sac.escrever', ({ corpo }) => {
  if (!corpo.clienteId) throw new ErroDeRegra('Selecione o cliente.');
  if (!String(corpo.assunto || '').trim()) throw new ErroDeRegra('Informe o assunto do chamado.');
  const r = executar(
    `INSERT INTO chamado (numero, cliente_id, moto_id, assunto, descricao, responsavel_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    proximoNumeroChamado(), corpo.clienteId, corpo.motoId || null,
    corpo.assunto, corpo.descricao || null, corpo.responsavelId || null
  );
  return { id: Number(r.lastInsertRowid) };
});

rota('PUT', '/api/chamados/:id', 'sac.escrever', ({ params, corpo }) => {
  if (corpo.situacao === 'resolvido') {
    executar(
      `UPDATE chamado SET situacao = 'resolvido',
              data_conclusao = date('now','localtime'),
              ultima_movimentacao = date('now','localtime')
        WHERE id = ?`, params[0]);
  } else {
    // qualquer outra atualizacao conta como movimentacao (RNFR-02.1)
    executar(
      `UPDATE chamado SET descricao = COALESCE(?, descricao),
              responsavel_id = COALESCE(?, responsavel_id),
              situacao = 'andamento', data_conclusao = NULL,
              ultima_movimentacao = date('now','localtime')
        WHERE id = ?`,
      corpo.descricao || null, corpo.responsavelId || null, params[0]);
  }
  return { ok: true };
});

// =====================================================================
//  RF-03 — ESTOQUE
// =====================================================================
rota('GET', '/api/estoque', 'estoque.ler', ({ query }) => {
  const situacao = query.situacao || null;
  const busca = query.busca ? `%${query.busca}%` : null;
  return todos(
    `SELECT * FROM vw_estoque
      WHERE (? IS NULL OR situacao = ?)
        AND (? IS NULL OR codigo LIKE ? OR modelo LIKE ? OR placa LIKE ?)
      ORDER BY parada_90_dias DESC, dias_patio DESC`,
    situacao, situacao, busca, busca, busca, busca
  );
});

rota('POST', '/api/estoque', 'estoque.escrever', ({ corpo }) => {
  const obrigatorios = ['codigo', 'marca', 'modelo', 'ano'];
  for (const campo of obrigatorios) {
    if (!String(corpo[campo] || '').trim()) throw new ErroDeRegra(`Preencha o campo ${campo}.`);
  }
  if (um('SELECT id FROM moto WHERE codigo = ?', corpo.codigo)) {
    throw new ErroDeRegra('Ja existe uma moto com este codigo interno.');
  }
  if (Number(corpo.precoVenda) < Number(corpo.custo)) {
    throw new ErroDeRegra('O preco de venda esta abaixo do custo. Confira os valores.');
  }
  const r = executar(
    `INSERT INTO moto (codigo, marca, modelo, ano, cor, placa, chassi, km, tipo,
                       custo, preco_venda, data_entrada, situacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, date('now','localtime')), ?)`,
    corpo.codigo, corpo.marca, corpo.modelo, Number(corpo.ano), corpo.cor || null,
    corpo.placa || null, corpo.chassi || null, Number(corpo.km) || 0,
    corpo.tipo || 'seminova', Number(corpo.custo) || 0, Number(corpo.precoVenda) || 0,
    corpo.dataEntrada || null, corpo.situacao || 'disponivel'
  );
  return { id: Number(r.lastInsertRowid) };
});

rota('PUT', '/api/estoque/:id', 'estoque.escrever', ({ params, corpo }) => {
  const moto = um('SELECT * FROM moto WHERE id = ?', params[0]);
  if (!moto) throw new ErroDeRegra('Moto nao encontrada.');
  if (moto.situacao === 'vendida') throw new ErroDeRegra('Moto ja vendida nao pode ser alterada.');
  executar(
    `UPDATE moto SET cor = ?, placa = ?, km = ?, custo = ?, preco_venda = ?, situacao = ?
      WHERE id = ?`,
    corpo.cor || moto.cor, corpo.placa || moto.placa, Number(corpo.km) || moto.km,
    Number(corpo.custo) || moto.custo, Number(corpo.precoVenda) || moto.preco_venda,
    corpo.situacao || moto.situacao, params[0]
  );
  return { ok: true };
});

// =====================================================================
//  RF-04 / RF-05 — FINANCEIRO
// =====================================================================
rota('GET', '/api/financeiro/resumo', 'financeiro.ler', () => {
  const aReceber = um(`
    SELECT COALESCE(SUM(valor),0) AS valor, COUNT(*) AS parcelas
    FROM vw_parcela WHERE situacao_real IN ('aberta','vencida')`);
  const vencidas = um(`
    SELECT COALESCE(SUM(valor),0) AS valor, COUNT(*) AS parcelas,
           COUNT(DISTINCT cliente_id) AS clientes
    FROM vw_parcela WHERE situacao_real = 'vencida'`);
  const recebidoMes = um(`
    SELECT COALESCE(SUM(valor),0) AS valor FROM parcela
    WHERE situacao = 'paga'
      AND strftime('%Y-%m', data_pagamento) = strftime('%Y-%m', date('now','localtime'))`);
  const folha = um(`SELECT COALESCE(SUM(salario),0) AS valor FROM funcionario WHERE situacao <> 'desligado'`);
  const comissoes = um(`
    SELECT COALESCE(SUM(comissao),0) AS valor FROM vw_comissao
    WHERE competencia = strftime('%Y-%m', date('now','localtime'))`);
  return { aReceber, vencidas, recebidoMes, aPagar: { folha: folha.valor, comissoes: comissoes.valor } };
});

rota('GET', '/api/contratos', 'financeiro.ler', () =>
  todos(`
    SELECT c.*, cl.nome AS cliente_nome, m.codigo AS moto_codigo, m.modelo,
           f.nome AS vendedor_nome,
           (SELECT COUNT(*) FROM parcela p WHERE p.contrato_id = c.id) AS total_parcelas,
           (SELECT COUNT(*) FROM parcela p WHERE p.contrato_id = c.id AND p.situacao = 'paga') AS parcelas_pagas
      FROM contrato c
      JOIN cliente cl ON cl.id = c.cliente_id
      JOIN moto m ON m.id = c.moto_id
      JOIN funcionario f ON f.id = c.vendedor_id
     ORDER BY c.data_emissao DESC`)
);

rota('GET', '/api/contratos/:id', 'financeiro.ler', ({ params }) => {
  const contrato = um(`
    SELECT c.*, cl.nome AS cliente_nome, cl.cpf, cl.telefone, cl.cidade,
           m.codigo AS moto_codigo, m.marca, m.modelo, m.ano, m.cor, m.placa, m.chassi,
           f.nome AS vendedor_nome
      FROM contrato c
      JOIN cliente cl ON cl.id = c.cliente_id
      JOIN moto m ON m.id = c.moto_id
      JOIN funcionario f ON f.id = c.vendedor_id
     WHERE c.id = ?`, params[0]);
  if (!contrato) throw new ErroDeRegra('Contrato nao encontrado.');
  contrato.parcelas = todos(
    'SELECT * FROM vw_parcela WHERE contrato_id = ? ORDER BY numero', params[0]);
  return contrato;
});

// RNFR-04.3 — somente o perfil Dono pode cancelar um contrato ja emitido.
rota('POST', '/api/contratos/:id/cancelar', 'contrato.cancelar', ({ params, corpo, usuario }) => {
  const contrato = um('SELECT * FROM contrato WHERE id = ?', params[0]);
  if (!contrato) throw new ErroDeRegra('Contrato nao encontrado.');
  if (contrato.situacao === 'cancelado') throw new ErroDeRegra('Contrato ja esta cancelado.');
  if (!String(corpo.motivo || '').trim()) throw new ErroDeRegra('Informe o motivo do cancelamento.');

  executar(
    `UPDATE contrato SET situacao = 'cancelado', cancelado_por = ?, motivo_cancelamento = ? WHERE id = ?`,
    usuario.id, corpo.motivo, params[0]);
  executar(
    `UPDATE parcela SET situacao = 'cancelada' WHERE contrato_id = ? AND situacao <> 'paga'`, params[0]);
  // a moto volta para o patio
  executar(
    `UPDATE moto SET situacao = 'disponivel', data_saida = NULL WHERE id = ?`, contrato.moto_id);
  return { ok: true };
});

rota('GET', '/api/parcelas', 'financeiro.ler', ({ query }) => {
  const situacao = query.situacao || null;
  return todos(
    `SELECT * FROM vw_parcela
      WHERE (? IS NULL OR situacao_real = ?)
      ORDER BY vencimento`, situacao, situacao);
});

rota('POST', '/api/parcelas/:id/baixar', 'financeiro.escrever', ({ params }) => {
  const parcela = um('SELECT * FROM parcela WHERE id = ?', params[0]);
  if (!parcela) throw new ErroDeRegra('Parcela nao encontrada.');
  if (parcela.situacao === 'paga') throw new ErroDeRegra('Esta parcela ja esta quitada.');
  executar(
    `UPDATE parcela SET situacao = 'paga', data_pagamento = date('now','localtime') WHERE id = ?`,
    params[0]);

  // contrato inteiro quitado?
  const restam = um(
    `SELECT COUNT(*) AS total FROM parcela WHERE contrato_id = ? AND situacao = 'aberta'`,
    parcela.contrato_id);
  if (restam.total === 0) {
    executar(`UPDATE contrato SET situacao = 'quitado' WHERE id = ?`, parcela.contrato_id);
  }
  return { ok: true, contratoQuitado: restam.total === 0 };
});

// RF-05 — regua de cobranca
rota('GET', '/api/cobranca', 'financeiro.ler', () => reguaDeCobranca());

rota('POST', '/api/cobranca', 'financeiro.escrever', ({ corpo, usuario }) => {
  const tipos = ['lembrete', 'segunda_via', 'contato', 'negativacao'];
  if (!tipos.includes(corpo.tipo)) throw new ErroDeRegra('Tipo de cobranca invalido.');

  // RNFR-05.2 — a negativacao depende de autorizacao expressa do proprietario.
  if (corpo.tipo === 'negativacao' && !pode(usuario, 'negativacao')) {
    throw new ErroDeRegra('A negativacao do cliente depende da autorizacao do proprietario.');
  }

  executar(
    `INSERT INTO cobranca (parcela_id, tipo, canal, observacao, autorizado_por)
     VALUES (?, ?, ?, ?, ?)`,
    corpo.parcelaId, corpo.tipo, corpo.canal || 'whatsapp', corpo.observacao || null,
    corpo.tipo === 'negativacao' ? usuario.id : null
  );
  return { ok: true };
});

// =====================================================================
//  RF-06 / RF-07 — RECURSOS HUMANOS
// =====================================================================
rota('GET', '/api/rh/funcionarios', 'rh.ler', ({ usuario }) => {
  const lista = todos(`
    SELECT f.*,
           (SELECT data_inicio FROM ferias fe
             WHERE fe.funcionario_id = f.id AND fe.situacao = 'programada'
             ORDER BY fe.data_inicio LIMIT 1) AS proximas_ferias,
           CAST((julianday(date('now','localtime')) - julianday(f.data_admissao)) / 365 AS INTEGER) AS anos_casa
      FROM funcionario f
     ORDER BY CASE f.situacao WHEN 'desligado' THEN 1 ELSE 0 END, f.setor, f.nome`);

  // RNFR-06.1 — os dados de folha (salario e comissao) sao visiveis
  // somente ao perfil Dono. Para os demais, o campo nem sai do servidor.
  if (pode(usuario, 'folha.ler')) return lista;
  return lista.map(({ salario, percentual_comissao, ...resto }) => resto);
});

rota('GET', '/api/rh/folha', 'folha.ler', () => {
  const funcionarios = todos(`
    SELECT f.id, f.nome, f.cargo, f.setor, f.salario, f.percentual_comissao,
           COALESCE(vc.comissao, 0) AS comissao,
           f.salario + COALESCE(vc.comissao, 0) AS total
      FROM funcionario f
      LEFT JOIN vw_comissao vc
        ON vc.vendedor_id = f.id
       AND vc.competencia = strftime('%Y-%m', date('now','localtime'))
     WHERE f.situacao <> 'desligado'
     ORDER BY f.setor, f.nome`);
  const total = funcionarios.reduce((s, f) => s + f.total, 0);
  return { competencia: new Date().toISOString().slice(0, 7), funcionarios, total };
});

// RF-07 — comissoes. RNFR-07.2: o vendedor so ve a propria.
rota('GET', '/api/rh/comissoes', 'livre', ({ usuario, query }) => {
  const competencia = query.competencia || new Date().toISOString().slice(0, 7);
  if (pode(usuario, 'folha.ler')) {
    return todos('SELECT * FROM vw_comissao WHERE competencia = ? ORDER BY comissao DESC', competencia);
  }
  return todos(
    'SELECT * FROM vw_comissao WHERE competencia = ? AND vendedor_id = ?',
    competencia, usuario.funcionarioId);
});

rota('POST', '/api/rh/funcionarios', 'rh.escrever', ({ corpo }) => {
  if (!cpfValido(corpo.cpf)) throw new ErroDeRegra('CPF invalido.');
  if (!String(corpo.nome || '').trim()) throw new ErroDeRegra('Informe o nome do funcionario.');
  const r = executar(
    `INSERT INTO funcionario (nome, cpf, cargo, setor, data_admissao, salario, percentual_comissao, meta_mensal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    corpo.nome, formatarCpf(corpo.cpf), corpo.cargo || 'Nao informado',
    corpo.setor || 'administrativo', corpo.dataAdmissao || new Date().toISOString().slice(0, 10),
    Number(corpo.salario) || 0, Number(corpo.percentualComissao) || 0, Number(corpo.metaMensal) || 0
  );
  return { id: Number(r.lastInsertRowid) };
});

rota('PUT', '/api/rh/funcionarios/:id', 'rh.escrever', ({ params, corpo }) => {
  // RNFR-06.3 — o historico e preservado: desligar nao apaga o registro.
  if (corpo.situacao === 'desligado') {
    executar(
      `UPDATE funcionario SET situacao = 'desligado', data_desligamento = date('now','localtime') WHERE id = ?`,
      params[0]);
    executar('UPDATE usuario SET ativo = 0 WHERE funcionario_id = ?', params[0]);
    return { ok: true };
  }
  executar(
    `UPDATE funcionario SET cargo = ?, setor = ?, salario = ?, percentual_comissao = ?,
            meta_mensal = ?, situacao = ?
      WHERE id = ?`,
    corpo.cargo, corpo.setor, Number(corpo.salario) || 0,
    Number(corpo.percentualComissao) || 0, Number(corpo.metaMensal) || 0,
    corpo.situacao || 'ativo', params[0]);
  return { ok: true };
});

rota('GET', '/api/rh/ferias', 'rh.ler', () =>
  todos(`
    SELECT fe.*, f.nome,
           CAST(julianday(fe.data_inicio) - julianday(date('now','localtime')) AS INTEGER) AS faltam_dias
      FROM ferias fe JOIN funcionario f ON f.id = fe.funcionario_id
     ORDER BY fe.data_inicio DESC`)
);

// =====================================================================
//  APOIO
// =====================================================================
rota('GET', '/api/apoio/listas', 'livre', ({ usuario }) => ({
  vendedores: todos(
    "SELECT id, nome FROM funcionario WHERE setor = 'comercial' AND situacao <> 'desligado' ORDER BY nome"),
  funcionarios: todos(
    "SELECT id, nome, setor FROM funcionario WHERE situacao <> 'desligado' ORDER BY nome"),
  motosDisponiveis: todos(
    `SELECT id, codigo, marca, modelo, ano, cor, preco_venda FROM moto
      WHERE situacao IN ('disponivel','reservada','preparacao') ORDER BY codigo`),
  clientes: pode(usuario, 'painel.gerencial')
    ? todos('SELECT id, nome, cpf FROM cliente ORDER BY nome')
    : todos('SELECT id, nome, cpf FROM cliente WHERE vendedor_id = ? ORDER BY nome', usuario.funcionarioId),
}));

rota('GET', '/api/parametros', 'parametros', () => todos('SELECT * FROM parametro ORDER BY chave'));

rota('PUT', '/api/parametros', 'parametros', ({ corpo }) => {
  for (const [chave, valor] of Object.entries(corpo)) {
    executar('UPDATE parametro SET valor = ? WHERE chave = ?', String(valor), chave);
  }
  return { ok: true };
});

// RNFS-06 — copia de seguranca da base
rota('POST', '/api/backup', 'parametros', () => ({ arquivo: gerarBackup() }));
