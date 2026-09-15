// =====================================================================
//  Regras de negocio
//  Concentra o que nao e simples leitura de tabela: validacoes,
//  fechamento da venda e regua de cobranca.
// =====================================================================

import { todos, um, executar, emTransacao, parametro } from './banco.js';

// ---------------------------------------------------------------------
// RNFR-01.2 - o cadastro do cliente exige CPF valido e um telefone.
// Confere os dois digitos verificadores, nao apenas o tamanho.
// ---------------------------------------------------------------------
export function cpfValido(entrada) {
  const numeros = String(entrada || '').replace(/\D/g, '');
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  const digito = (quantidade) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) soma += Number(numeros[i]) * (quantidade + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(numeros[9]) && digito(10) === Number(numeros[10]);
}

export function formatarCpf(entrada) {
  const n = String(entrada || '').replace(/\D/g, '');
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

export function telefoneValido(entrada) {
  return String(entrada || '').replace(/\D/g, '').length >= 10;
}

// ---------------------------------------------------------------------
// RNFR-04.2 - numero de contrato unico e sequencial.
// ---------------------------------------------------------------------
export function proximoNumeroContrato(banco) {
  const ano = new Date().getFullYear();
  const ultimo = banco
    .prepare("SELECT numero FROM contrato WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1")
    .get(`CT-${ano}-%`);
  const sequencia = ultimo ? Number(ultimo.numero.split('-')[2]) + 1 : 1;
  return `CT-${ano}-${String(sequencia).padStart(4, '0')}`;
}

export function proximoNumeroChamado() {
  const ultimo = um("SELECT numero FROM chamado ORDER BY id DESC LIMIT 1");
  const sequencia = ultimo ? Number(String(ultimo.numero).replace('#', '')) + 1 : 1001;
  return `#${sequencia}`;
}

// ---------------------------------------------------------------------
// RF-04 - Fechamento da venda.
//
// Tudo acontece numa unica transacao: ou os quatro passos abaixo dao
// certo juntos, ou nada e gravado.
//   1. gera o contrato com numero sequencial
//   2. gera as parcelas / boletos da condicao negociada
//   3. da baixa da motocicleta no estoque
//   4. move a negociacao para "fechada" e registra o historico
// ---------------------------------------------------------------------
export function fecharVenda(dados, usuario) {
  const {
    negociacaoId,
    formaPagamento,
    valorTotal,
    valorEntrada = 0,
    qtdParcelas = 1,
    banco: bancoFinanciador = null,
    primeiroVencimento = null,
  } = dados;

  const formasAceitas = ['avista', 'financiado', 'entrada_parcelas'];
  if (!formasAceitas.includes(formaPagamento)) {
    throw new ErroDeRegra('Forma de pagamento invalida.');
  }

  const total = Number(valorTotal);
  const entrada = Number(valorEntrada) || 0;
  const parcelas = formaPagamento === 'avista' ? 1 : Number(qtdParcelas);

  if (!(total > 0)) throw new ErroDeRegra('O valor total da venda deve ser maior que zero.');
  if (entrada < 0 || entrada > total) throw new ErroDeRegra('A entrada nao pode ser maior que o valor da venda.');
  if (!(parcelas >= 1 && parcelas <= 48)) throw new ErroDeRegra('A quantidade de parcelas deve ficar entre 1 e 48.');

  return emTransacao((banco) => {
    const negociacao = banco
      .prepare('SELECT * FROM negociacao WHERE id = ?')
      .get(negociacaoId);

    if (!negociacao) throw new ErroDeRegra('Negociacao nao encontrada.');
    if (negociacao.etapa === 'fechada') throw new ErroDeRegra('Esta negociacao ja foi fechada.');
    if (!negociacao.moto_id) throw new ErroDeRegra('Selecione a motocicleta antes de fechar a venda.');

    const moto = banco.prepare('SELECT * FROM moto WHERE id = ?').get(negociacao.moto_id);
    if (!moto) throw new ErroDeRegra('Motocicleta nao encontrada.');
    if (moto.situacao === 'vendida') throw new ErroDeRegra(`A moto ${moto.codigo} ja consta como vendida.`);

    // 1. contrato
    const numero = proximoNumeroContrato(banco);
    const contrato = banco.prepare(
      `INSERT INTO contrato
         (numero, negociacao_id, cliente_id, moto_id, vendedor_id,
          forma_pagamento, valor_total, valor_entrada, qtd_parcelas, banco, data_emissao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now','localtime'))`
    ).run(
      numero, negociacao.id, negociacao.cliente_id, negociacao.moto_id, negociacao.vendedor_id,
      formaPagamento, total, entrada, parcelas, bancoFinanciador
    );
    const contratoId = Number(contrato.lastInsertRowid);

    // 2. parcelas
    const valorFinanciado = total - entrada;
    const valorParcela = Math.round((valorFinanciado / parcelas) * 100) / 100;
    const inserirParcela = banco.prepare(
      `INSERT INTO parcela (contrato_id, numero, valor, vencimento, situacao, data_pagamento)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const hoje = banco.prepare("SELECT date('now','localtime') AS d").get().d;

    let acumulado = 0;
    for (let i = 1; i <= parcelas; i++) {
      // a ultima parcela absorve o arredondamento, para o somatorio
      // bater exatamente com o valor financiado
      const valor = i === parcelas
        ? Math.round((valorFinanciado - acumulado) * 100) / 100
        : valorParcela;
      acumulado += valor;

      // Na venda a vista o pagamento acontece no ato; nas demais, as
      // parcelas vencem de trinta em trinta dias.
      const aVista = formaPagamento === 'avista';
      const vencimento = aVista
        ? hoje
        : primeiroVencimento
          ? banco.prepare("SELECT date(?, '+' || ? || ' months') AS d").get(primeiroVencimento, i - 1).d
          : banco.prepare("SELECT date('now','localtime','+' || ? || ' months') AS d").get(i).d;

      inserirParcela.run(
        contratoId, i, valor, vencimento,
        aVista ? 'paga' : 'aberta',
        aVista ? hoje : null
      );
    }

    // Venda a vista ja nasce quitada
    if (formaPagamento === 'avista') {
      banco.prepare("UPDATE contrato SET situacao = 'quitado' WHERE id = ?").run(contratoId);
    }

    // 3. baixa no estoque
    banco.prepare(
      "UPDATE moto SET situacao = 'vendida', data_saida = date('now','localtime') WHERE id = ?"
    ).run(negociacao.moto_id);

    // 4. funil
    banco.prepare(
      "UPDATE negociacao SET etapa = 'fechada', valor_negociado = ?, atualizado_em = datetime('now','localtime') WHERE id = ?"
    ).run(total, negociacao.id);

    banco.prepare(
      `INSERT INTO negociacao_historico (negociacao_id, etapa_de, etapa_para, usuario_id, responsavel)
       VALUES (?, ?, 'fechada', ?, ?)`
    ).run(negociacao.id, negociacao.etapa, usuario.id, usuario.nome);

    return { contratoId, numero, parcelas, valorParcela };
  });
}

// ---------------------------------------------------------------------
// RF-05 - Regua de cobranca.
// Le os prazos da tabela de parametros e diz, para cada parcela em
// atraso, qual acao a loja deveria estar tomando hoje.
// ---------------------------------------------------------------------
export function reguaDeCobranca() {
  const prazos = {
    lembrete: Number(parametro('regua_lembrete', 3)),
    segundaVia: Number(parametro('regua_segunda_via', 1)),
    contato: Number(parametro('regua_contato', 7)),
    negativacao: Number(parametro('regua_negativacao', 15)),
  };

  // A regua so lista o que exige acao agora: parcelas ja vencidas e as
  // que vencem dentro da janela do lembrete. As demais parcelas em
  // aberto ficam no extrato do contrato, e nao aqui.
  const parcelas = todos(
    `SELECT p.*, c.numero AS contrato_numero, cl.nome AS cliente_nome, cl.telefone
       FROM vw_parcela p
       JOIN contrato c ON c.id = p.contrato_id
       JOIN cliente cl ON cl.id = c.cliente_id
      WHERE p.situacao_real = 'vencida'
         OR (p.situacao_real = 'aberta'
             AND date(p.vencimento) <= date('now','localtime','+' || ? || ' days'))
      ORDER BY p.vencimento`,
    prazos.lembrete
  );

  return parcelas.map((p) => {
    const atraso = p.dias_atraso;
    let acao = 'em dia';
    if (atraso >= prazos.negativacao) acao = 'propor negativacao';
    else if (atraso >= prazos.contato) acao = 'contato do financeiro';
    else if (atraso >= prazos.segundaVia) acao = 'enviar segunda via';
    else if (atraso >= -prazos.lembrete) acao = 'enviar lembrete';

    const executadas = todos(
      'SELECT tipo, momento FROM cobranca WHERE parcela_id = ? ORDER BY momento',
      p.id
    );

    return { ...p, acao_sugerida: acao, cobrancas: executadas };
  });
}

// ---------------------------------------------------------------------
// Erro previsto de regra de negocio: vira mensagem para o usuario,
// e nao erro 500 de sistema.
// ---------------------------------------------------------------------
export class ErroDeRegra extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeRegra';
    this.status = 400;
  }
}
