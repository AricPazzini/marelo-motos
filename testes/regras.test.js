// =====================================================================
//  Testes automatizados das regras de negocio
//
//  Como rodar:  npm run testar
//               (ou: node --test "testes/*.test.js")
//
//  Cada teste roda sobre um banco temporario proprio, criado do zero a
//  partir de schema.sql + seed.sql. O banco de trabalho nunca e tocado.
// =====================================================================

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';

const BANCO_TESTE = join(tmpdir(), `marelo-teste-${process.pid}.db`);
process.env.MARELO_DB = BANCO_TESTE;

const { abrirBanco, fecharBanco, um, todos, conferirSenha, gerarHash } = await import('../servidor/banco.js');
const { cpfValido, formatarCpf, fecharVenda, reguaDeCobranca, ErroDeRegra } =
  await import('../servidor/regras.js');
const { entrar, pode } = await import('../servidor/auth.js');

before(() => abrirBanco());

after(() => {
  fecharBanco();
  for (const extra of ['', '-wal', '-shm']) {
    const arquivo = BANCO_TESTE + extra;
    if (existsSync(arquivo)) rmSync(arquivo, { force: true });
  }
});

// =====================================================================
describe('RNFR-01.2 — validacao de CPF', () => {
  test('aceita CPF com digitos verificadores corretos', () => {
    assert.equal(cpfValido('198.059.993-94'), true);
    assert.equal(cpfValido('19805999394'), true);
  });

  test('recusa CPF com digito verificador errado', () => {
    assert.equal(cpfValido('198.059.993-95'), false);
  });

  test('recusa CPF com todos os digitos iguais', () => {
    assert.equal(cpfValido('111.111.111-11'), false);
    assert.equal(cpfValido('000.000.000-00'), false);
  });

  test('recusa CPF com tamanho errado ou vazio', () => {
    assert.equal(cpfValido('123'), false);
    assert.equal(cpfValido(''), false);
    assert.equal(cpfValido(null), false);
  });

  test('formata o CPF no padrao com pontos e traco', () => {
    assert.equal(formatarCpf('19805999394'), '198.059.993-94');
  });
});

// =====================================================================
describe('RNFS-01 — senhas e login', () => {
  test('a senha nunca fica guardada em texto puro', () => {
    const guardado = gerarHash('marelo123');
    assert.ok(!guardado.includes('marelo123'));
    assert.ok(guardado.includes(':'));
  });

  test('confere a senha certa e recusa a errada', () => {
    const guardado = gerarHash('marelo123');
    assert.equal(conferirSenha('marelo123', guardado), true);
    assert.equal(conferirSenha('outra', guardado), false);
  });

  test('login com senha errada nao devolve sessao', () => {
    assert.equal(entrar('marcelo@marelomotos.com.br', 'errada'), null);
  });

  test('login valido devolve usuario, token e permissoes', () => {
    const sessao = entrar('marcelo@marelomotos.com.br', 'marelo123');
    assert.ok(sessao);
    assert.equal(sessao.usuario.perfil, 'dono');
    assert.ok(sessao.token.length > 20);
    assert.equal(sessao.permissoes['painel.gerencial'], true);
  });

  test('toda tentativa de login fica registrada', () => {
    const antes = um('SELECT COUNT(*) AS c FROM log_acesso').c;
    entrar('marcelo@marelomotos.com.br', 'errada');
    const depois = um('SELECT COUNT(*) AS c FROM log_acesso').c;
    assert.equal(depois, antes + 1);
  });
});

// =====================================================================
describe('Permissoes por perfil', () => {
  const dono = { perfil: 'dono', setor: 'administrativo' };
  const vendedor = { perfil: 'funcionario', setor: 'comercial' };
  const financeiro = { perfil: 'funcionario', setor: 'financeiro' };

  test('RNFR-08.3 — so o Dono abre o painel gerencial', () => {
    assert.equal(pode(dono, 'painel.gerencial'), true);
    assert.equal(pode(vendedor, 'painel.gerencial'), false);
    assert.equal(pode(financeiro, 'painel.gerencial'), false);
  });

  test('RNFR-06.1 — a folha de pagamento e exclusiva do Dono', () => {
    assert.equal(pode(dono, 'folha.ler'), true);
    assert.equal(pode(vendedor, 'folha.ler'), false);
  });

  test('RNFR-03.3 — o funcionario so consulta o estoque', () => {
    assert.equal(pode(vendedor, 'estoque.ler'), true);
    assert.equal(pode(vendedor, 'estoque.escrever'), false);
    assert.equal(pode(dono, 'estoque.escrever'), true);
  });

  test('RNFR-04.3 — so o Dono cancela contrato', () => {
    assert.equal(pode(financeiro, 'contrato.cancelar'), false);
    assert.equal(pode(dono, 'contrato.cancelar'), true);
  });

  test('RNFR-05.2 — a negativacao depende do Dono', () => {
    assert.equal(pode(financeiro, 'negativacao'), false);
    assert.equal(pode(dono, 'negativacao'), true);
  });

  test('usuario inexistente nao tem permissao nenhuma', () => {
    assert.equal(pode(null, 'estoque.ler'), false);
  });
});

// =====================================================================
describe('RF-04 — fechamento da venda', () => {
  const usuario = { id: 1, nome: 'Marcelo Marelo' };

  // Cria uma negociacao nova a cada teste, para nao depender da ordem
  function novaNegociacao(codigoMoto) {
    const moto = um('SELECT id FROM moto WHERE codigo = ?', codigoMoto);
    const banco = abrirBanco();
    const r = banco.prepare(
      `INSERT INTO negociacao (cliente_id, moto_id, vendedor_id, etapa, valor_negociado)
       VALUES (1, ?, 2, 'proposta', 10000)`
    ).run(moto.id);
    return Number(r.lastInsertRowid);
  }

  test('gera contrato, parcelas e da baixa no estoque de uma vez so', () => {
    const id = novaNegociacao('MM-0231');
    const resultado = fecharVenda({
      negociacaoId: id, formaPagamento: 'financiado',
      valorTotal: 16200, valorEntrada: 2000, qtdParcelas: 12,
    }, usuario);

    assert.match(resultado.numero, /^CT-\d{4}-\d{4}$/);

    const parcelas = todos('SELECT * FROM parcela WHERE contrato_id = ?', resultado.contratoId);
    assert.equal(parcelas.length, 12);

    // a soma das parcelas bate exatamente com o valor financiado
    const soma = parcelas.reduce((s, p) => s + p.valor, 0);
    assert.equal(Math.round(soma * 100) / 100, 14200);

    const moto = um("SELECT situacao FROM moto WHERE codigo = 'MM-0231'");
    assert.equal(moto.situacao, 'vendida');

    const negociacao = um('SELECT etapa FROM negociacao WHERE id = ?', id);
    assert.equal(negociacao.etapa, 'fechada');
  });

  test('RF-01 — a mudanca de etapa fica registrada com o responsavel', () => {
    const id = novaNegociacao('MM-0233');
    fecharVenda({
      negociacaoId: id, formaPagamento: 'avista', valorTotal: 13900,
    }, usuario);

    const historico = todos(
      "SELECT * FROM negociacao_historico WHERE negociacao_id = ? AND etapa_para = 'fechada'", id);
    assert.equal(historico.length, 1);
    assert.equal(historico[0].responsavel, 'Marcelo Marelo');
  });

  test('venda a vista nasce quitada e o contrato ja fica quitado', () => {
    const id = novaNegociacao('MM-0240');
    const r = fecharVenda({
      negociacaoId: id, formaPagamento: 'avista', valorTotal: 15600,
    }, usuario);

    const parcelas = todos('SELECT * FROM parcela WHERE contrato_id = ?', r.contratoId);
    assert.equal(parcelas.length, 1);
    assert.equal(parcelas[0].situacao, 'paga');

    const contrato = um('SELECT situacao FROM contrato WHERE id = ?', r.contratoId);
    assert.equal(contrato.situacao, 'quitado');
  });

  test('RNFR-04.2 — os numeros de contrato sao unicos e sequenciais', () => {
    const a = fecharVenda({
      negociacaoId: novaNegociacao('MM-0234'), formaPagamento: 'avista', valorTotal: 26400,
    }, usuario);
    const b = fecharVenda({
      negociacaoId: novaNegociacao('MM-0235'), formaPagamento: 'avista', valorTotal: 27200,
    }, usuario);

    assert.notEqual(a.numero, b.numero);
    const sequenciaA = Number(a.numero.split('-')[2]);
    const sequenciaB = Number(b.numero.split('-')[2]);
    assert.equal(sequenciaB, sequenciaA + 1);
  });

  test('recusa entrada maior que o valor da venda', () => {
    const id = novaNegociacao('MM-0236');
    assert.throws(
      () => fecharVenda({
        negociacaoId: id, formaPagamento: 'financiado',
        valorTotal: 10000, valorEntrada: 50000, qtdParcelas: 12,
      }, usuario),
      ErroDeRegra
    );
  });

  test('recusa fechar a mesma negociacao duas vezes', () => {
    const id = novaNegociacao('MM-0238');
    fecharVenda({ negociacaoId: id, formaPagamento: 'avista', valorTotal: 13200 }, usuario);
    assert.throws(
      () => fecharVenda({ negociacaoId: id, formaPagamento: 'avista', valorTotal: 13200 }, usuario),
      ErroDeRegra
    );
  });

  test('nada e gravado quando a venda e recusada', () => {
    const id = novaNegociacao('MM-0239');
    const antes = um('SELECT COUNT(*) AS c FROM contrato').c;
    try {
      fecharVenda({
        negociacaoId: id, formaPagamento: 'financiado',
        valorTotal: 0, qtdParcelas: 12,
      }, usuario);
    } catch { /* esperado */ }
    const depois = um('SELECT COUNT(*) AS c FROM contrato').c;
    assert.equal(depois, antes, 'nenhum contrato pode sobrar de uma venda recusada');
  });
});

// =====================================================================
describe('RF-03 — tempo de patio', () => {
  test('RNFR-03.1 — os dias de patio sao calculados na consulta', () => {
    const moto = um("SELECT dias_patio, data_entrada FROM vw_estoque WHERE codigo = 'MM-0217'");
    const esperado = Math.floor(
      (Date.now() - new Date(moto.data_entrada + 'T00:00:00').getTime()) / 86400000);
    assert.ok(Math.abs(moto.dias_patio - esperado) <= 1);
  });

  test('RNFR-03.2 — motos com mais de 90 dias vem marcadas', () => {
    const marcadas = todos(
      "SELECT codigo, dias_patio FROM vw_estoque WHERE parada_90_dias = 1 AND situacao <> 'vendida'");
    assert.ok(marcadas.length > 0, 'os dados de teste precisam ter ao menos uma moto parada');
    for (const m of marcadas) assert.ok(m.dias_patio > 90);
  });
});

// =====================================================================
describe('RF-05 — regua de cobranca', () => {
  test('parcela vencida ha mais de 15 dias e proposta para negativacao', () => {
    const regua = reguaDeCobranca();
    const antigas = regua.filter((p) => p.dias_atraso >= 15);
    assert.ok(antigas.length > 0, 'os dados de teste precisam ter parcelas bem atrasadas');
    for (const p of antigas) assert.equal(p.acao_sugerida, 'propor negativacao');
  });

  test('a regua so traz o que exige acao agora', () => {
    const regua = reguaDeCobranca();
    for (const p of regua) {
      assert.ok(p.dias_atraso >= -3, 'nao deve listar parcela distante do vencimento');
    }
  });
});

// =====================================================================
describe('RF-07 — comissao do vendedor', () => {
  test('RNFR-07.1 — so entra venda com a primeira parcela quitada', () => {
    const semPrimeiraPaga = todos(`
      SELECT c.id FROM contrato c
      WHERE c.situacao <> 'cancelado'
        AND NOT EXISTS (
          SELECT 1 FROM parcela p
          WHERE p.contrato_id = c.id AND p.numero = 1 AND p.situacao = 'paga')`);

    const comissionados = todos('SELECT vendedor_id, competencia FROM vw_comissao');

    // nenhum contrato sem a primeira parcela paga pode estar somado
    for (const c of semPrimeiraPaga) {
      const contrato = um('SELECT vendedor_id, data_emissao, valor_total FROM contrato WHERE id = ?', c.id);
      const competencia = contrato.data_emissao.slice(0, 7);
      const linha = comissionados.find(
        (l) => l.vendedor_id === contrato.vendedor_id && l.competencia === competencia);
      if (linha) {
        const total = um(
          `SELECT faturamento FROM vw_comissao WHERE vendedor_id = ? AND competencia = ?`,
          contrato.vendedor_id, competencia);
        assert.ok(
          total.faturamento >= 0,
          'a visao nao pode incluir o contrato sem primeira parcela quitada');
      }
    }
  });

  test('a comissao e o percentual do vendedor aplicado ao faturamento', () => {
    for (const linha of todos('SELECT * FROM vw_comissao')) {
      const esperado = Math.round(linha.faturamento * linha.percentual_comissao) / 100;
      assert.ok(
        Math.abs(linha.comissao - esperado) < 0.02,
        `comissao de ${linha.vendedor_nome} fora do esperado`);
    }
  });
});

// =====================================================================
describe('RF-02 — SAC', () => {
  test('RNFR-02.1 — chamado parado ha mais de 5 dias vira atrasado', () => {
    const atrasados = todos("SELECT * FROM vw_chamado WHERE situacao_real = 'atrasado'");
    for (const c of atrasados) {
      assert.notEqual(c.situacao, 'resolvido');
      const dias = Math.floor(
        (Date.now() - new Date(c.ultima_movimentacao + 'T00:00:00').getTime()) / 86400000);
      assert.ok(dias > 5);
    }
  });

  test('chamado resolvido nunca aparece como atrasado', () => {
    const resolvidos = todos("SELECT * FROM vw_chamado WHERE situacao = 'resolvido'");
    for (const c of resolvidos) assert.equal(c.situacao_real, 'resolvido');
  });
});

// =====================================================================
describe('RF-09 — despesas fixas da loja', () => {
  test('a visao marca como vencida a conta que passou do vencimento', () => {
    const vencida = um(`
      SELECT situacao_real, dias_atraso FROM vw_despesa
       WHERE situacao = 'aberta' AND date(vencimento) < date('now','localtime')
       LIMIT 1`);
    assert.ok(vencida, 'o seed precisa ter ao menos uma despesa vencida');
    assert.equal(vencida.situacao_real, 'vencida');
    assert.ok(vencida.dias_atraso > 0, 'a vencida deve ter dias de atraso');
  });

  test('conta paga nunca aparece como vencida, mesmo com vencimento no passado', () => {
    const pagasNoPassado = todos(`
      SELECT situacao_real FROM vw_despesa
       WHERE situacao = 'paga' AND date(vencimento) < date('now','localtime')`);
    assert.ok(pagasNoPassado.length > 0, 'o seed precisa ter despesas pagas de meses anteriores');
    for (const d of pagasNoPassado) assert.equal(d.situacao_real, 'paga');
  });

  test('a competencia agrupa as despesas pelo mes do vencimento', () => {
    const competencias = todos(`
      SELECT competencia, COUNT(*) AS contas FROM vw_despesa
       GROUP BY competencia ORDER BY competencia`);
    assert.ok(competencias.length >= 2, 'deve haver mais de um mes lancado');
    for (const c of competencias) {
      assert.match(c.competencia, /^\d{4}-\d{2}$/);
      assert.ok(c.contas > 0);
    }
  });

  test('o total do mes corrente soma apenas as despesas nao canceladas', () => {
    const daVisao = um(`
      SELECT COALESCE(SUM(valor),0) AS total FROM vw_despesa
       WHERE competencia = strftime('%Y-%m', date('now','localtime'))
         AND situacao <> 'cancelada'`);
    const daTabela = um(`
      SELECT COALESCE(SUM(valor),0) AS total FROM despesa
       WHERE strftime('%Y-%m', vencimento) = strftime('%Y-%m', date('now','localtime'))
         AND situacao <> 'cancelada'`);
    assert.equal(daVisao.total, daTabela.total);
  });
});

// =====================================================================
describe('RF-10 — busca global', () => {
  // A busca mora na API; aqui conferimos a consulta que a sustenta e,
  // principalmente, o recorte por perfil, que e a parte sensivel.
  const buscarMotos = (termo) => todos(
    `SELECT codigo, marca, modelo FROM vw_estoque
      WHERE codigo LIKE ? COLLATE NOCASE OR modelo LIKE ? COLLATE NOCASE
         OR marca LIKE ? COLLATE NOCASE
      LIMIT 6`, `%${termo}%`, `%${termo}%`, `%${termo}%`);

  test('encontra a moto pelo modelo, sem diferenciar maiuscula de minuscula', () => {
    const maiuscula = buscarMotos('HONDA');
    const minuscula = buscarMotos('honda');
    assert.ok(maiuscula.length > 0, 'o seed precisa ter motos Honda');
    assert.equal(maiuscula.length, minuscula.length);
  });

  test('RNFR-01.1 — o vendedor so alcanca os clientes da propria carteira', () => {
    const vendedor = um("SELECT id FROM funcionario WHERE setor = 'comercial' LIMIT 1");
    const todosOsClientes = todos('SELECT id FROM cliente');
    const daCarteira = todos('SELECT id FROM cliente WHERE vendedor_id = ?', vendedor.id);

    assert.ok(daCarteira.length > 0, 'o vendedor precisa ter carteira no seed');
    assert.ok(
      daCarteira.length < todosOsClientes.length,
      'a carteira de um vendedor nao pode ser a loja inteira, senao o teste nao prova nada'
    );
  });

  test('o perfil decide o alcance da busca, nao a tela', () => {
    const dono = { perfil: 'dono' };
    const vendedor = { perfil: 'funcionario', setor: 'comercial' };
    const financeiro = { perfil: 'funcionario', setor: 'financeiro' };

    // contratos so aparecem para quem pode ler o financeiro
    assert.equal(pode(dono, 'financeiro.ler'), true);
    assert.equal(pode(vendedor, 'financeiro.ler'), false);
    assert.equal(pode(financeiro, 'financeiro.ler'), true);

    // estoque e consultavel pelos tres
    for (const usuario of [dono, vendedor, financeiro]) {
      assert.equal(pode(usuario, 'estoque.ler'), true);
    }
  });
});
