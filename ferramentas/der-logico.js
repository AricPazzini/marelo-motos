// =====================================================================
//  der-logico.js - Modelo Logico (relacional) do sistema Marelo Motos
//  Tabelas, colunas, chaves primarias e estrangeiras.
// =====================================================================
import { pagina, esc, TINTA } from './desenho-der.js';

const LARG = 372, CAB = 40, LIN = 26, PAD = 8;
const c = (nome, tipo, marca = '') => ({ nome, tipo, marca });

export const TABELAS = {
  funcionario: [c('id', 'INTEGER', 'PK'), c('nome', 'TEXT'), c('cpf', 'TEXT', 'UK'), c('cargo', 'TEXT'),
    c('setor', 'TEXT'), c('data_admissao', 'TEXT'), c('data_desligamento', 'TEXT'), c('salario', 'REAL'),
    c('percentual_comissao', 'REAL'), c('meta_mensal', 'INTEGER'), c('situacao', 'TEXT')],
  ferias: [c('id', 'INTEGER', 'PK'), c('funcionario_id', 'INTEGER', 'FK'), c('data_inicio', 'TEXT'),
    c('data_fim', 'TEXT'), c('situacao', 'TEXT')],
  usuario: [c('id', 'INTEGER', 'PK'), c('email', 'TEXT', 'UK'), c('senha_hash', 'TEXT'), c('perfil', 'TEXT'),
    c('funcionario_id', 'INTEGER', 'FK'), c('ativo', 'INTEGER'), c('criado_em', 'TEXT')],
  log_acesso: [c('id', 'INTEGER', 'PK'), c('usuario_id', 'INTEGER', 'FK'), c('email', 'TEXT'),
    c('sucesso', 'INTEGER'), c('momento', 'TEXT')],
  cliente: [c('id', 'INTEGER', 'PK'), c('nome', 'TEXT'), c('cpf', 'TEXT', 'UK'), c('telefone', 'TEXT'),
    c('email', 'TEXT'), c('cidade', 'TEXT'), c('origem', 'TEXT'), c('vendedor_id', 'INTEGER', 'FK'),
    c('observacao', 'TEXT'), c('criado_em', 'TEXT')],
  moto: [c('id', 'INTEGER', 'PK'), c('codigo', 'TEXT', 'UK'), c('marca', 'TEXT'), c('modelo', 'TEXT'),
    c('ano', 'INTEGER'), c('cor', 'TEXT'), c('placa', 'TEXT'), c('chassi', 'TEXT'), c('km', 'INTEGER'),
    c('tipo', 'TEXT'), c('custo', 'REAL'), c('preco_venda', 'REAL'), c('data_entrada', 'TEXT'),
    c('data_saida', 'TEXT'), c('situacao', 'TEXT')],
  negociacao: [c('id', 'INTEGER', 'PK'), c('cliente_id', 'INTEGER', 'FK'), c('moto_id', 'INTEGER', 'FK'),
    c('vendedor_id', 'INTEGER', 'FK'), c('etapa', 'TEXT'), c('valor_negociado', 'REAL'),
    c('motivo_perda', 'TEXT'), c('criado_em', 'TEXT'), c('atualizado_em', 'TEXT')],
  negociacao_historico: [c('id', 'INTEGER', 'PK'), c('negociacao_id', 'INTEGER', 'FK'), c('etapa_de', 'TEXT'),
    c('etapa_para', 'TEXT'), c('usuario_id', 'INTEGER', 'FK'), c('responsavel', 'TEXT'), c('momento', 'TEXT')],
  contrato: [c('id', 'INTEGER', 'PK'), c('numero', 'TEXT', 'UK'), c('negociacao_id', 'INTEGER', 'FK'),
    c('cliente_id', 'INTEGER', 'FK'), c('moto_id', 'INTEGER', 'FK'), c('vendedor_id', 'INTEGER', 'FK'),
    c('forma_pagamento', 'TEXT'), c('valor_total', 'REAL'), c('valor_entrada', 'REAL'),
    c('qtd_parcelas', 'INTEGER'), c('banco', 'TEXT'), c('data_emissao', 'TEXT'), c('situacao', 'TEXT'),
    c('cancelado_por', 'INTEGER', 'FK'), c('motivo_cancelamento', 'TEXT')],
  parcela: [c('id', 'INTEGER', 'PK'), c('contrato_id', 'INTEGER', 'FK'), c('numero', 'INTEGER', 'AK'),
    c('valor', 'REAL'), c('vencimento', 'TEXT'), c('data_pagamento', 'TEXT'), c('situacao', 'TEXT')],
  cobranca: [c('id', 'INTEGER', 'PK'), c('parcela_id', 'INTEGER', 'FK'), c('tipo', 'TEXT'), c('canal', 'TEXT'),
    c('observacao', 'TEXT'), c('autorizado_por', 'INTEGER', 'FK'), c('momento', 'TEXT')],
  chamado: [c('id', 'INTEGER', 'PK'), c('numero', 'TEXT', 'UK'), c('cliente_id', 'INTEGER', 'FK'),
    c('moto_id', 'INTEGER', 'FK'), c('assunto', 'TEXT'), c('descricao', 'TEXT'),
    c('responsavel_id', 'INTEGER', 'FK'), c('data_abertura', 'TEXT'), c('ultima_movimentacao', 'TEXT'),
    c('data_conclusao', 'TEXT'), c('situacao', 'TEXT')],
  parametro: [c('chave', 'TEXT', 'PK'), c('valor', 'TEXT'), c('descricao', 'TEXT')],
};

const POS = {
  funcionario: [620, 120], cliente: [620, 560], moto: [620, 930],
  ferias: [60, 120], usuario: [60, 400], log_acesso: [60, 700], parametro: [60, 960],
  negociacao: [1180, 120], negociacao_historico: [1180, 470], chamado: [1180, 760],
  contrato: [1740, 120], parcela: [1740, 620], cobranca: [1740, 900],
};

export const alturaTabela = (t) => CAB + TABELAS[t].length * LIN + PAD;
const linhaY = (t, col) => POS[t][1] + CAB + TABELAS[t].findIndex((k) => k.nome === col) * LIN + LIN / 2;
const esq = (t) => POS[t][0];
const dir = (t) => POS[t][0] + LARG;

function desenhaTabela(nome) {
  const [x, y] = POS[nome];
  const h = alturaTabela(nome);
  let s = '<rect x="' + x + '" y="' + y + '" width="' + LARG + '" height="' + h + '" rx="4" fill="#FFFFFF" stroke="' + TINTA + '" stroke-width="2.2"/>'
    + '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (LARG - 2) + '" height="' + (CAB - 1) + '" fill="#FFE9B8"/>'
    + '<path d="M ' + x + ' ' + (y + CAB) + ' H ' + (x + LARG) + '" stroke="' + TINTA + '" stroke-width="1.6"/>'
    + '<text x="' + (x + LARG / 2) + '" y="' + (y + 28) + '" text-anchor="middle" font-size="21" font-weight="700" fill="' + TINTA + '">' + esc(nome) + '</text>';
  TABELAS[nome].forEach((col, i) => {
    const ly = y + CAB + i * LIN;
    if (i % 2) s += '<rect x="' + (x + 1) + '" y="' + ly + '" width="' + (LARG - 2) + '" height="' + LIN + '" fill="#FAF7F0"/>';
    const pk = col.marca === 'PK';
    const fk = col.marca === 'FK';
    s += '<text x="' + (x + 14) + '" y="' + (ly + 18) + '" font-size="16.5" fill="' + TINTA + '"'
      + ' font-weight="' + (pk ? 700 : 400) + '" font-style="' + (fk ? 'italic' : 'normal') + '"'
      + (pk ? ' text-decoration="underline"' : '') + '>' + esc(col.nome) + '</text>';
    s += '<text x="' + (x + 236) + '" y="' + (ly + 18) + '" font-size="14" fill="#6B6559">' + esc(col.tipo) + '</text>';
    if (col.marca) s += '<text x="' + (x + LARG - 14) + '" y="' + (ly + 18) + '" text-anchor="end" font-size="13.5" font-weight="700" fill="'
      + (fk ? '#0F3D91' : '#9A6B00') + '">' + col.marca + '</text>';
  });
  return s;
}

const C = [
  { f: ['ferias', 'funcionario_id'], p: ['funcionario', 'id'], sai: 'dir', ent: 'esq', via: [[470, '@f'], [470, '@p']] },
  { f: ['usuario', 'funcionario_id'], p: ['funcionario', 'id'], sai: 'dir', ent: 'esq', via: [[505, '@f'], [505, '@p']] },
  { f: ['log_acesso', 'usuario_id'], p: ['usuario', 'id'], sai: 'esq', ent: 'esq', via: [[30, '@f'], [30, '@p']] },
  { f: ['cliente', 'vendedor_id'], p: ['funcionario', 'id'], sai: 'esq', ent: 'esq', via: [[565, '@f'], [565, '@p']] },
  { f: ['negociacao', 'cliente_id'], p: ['cliente', 'id'], sai: 'esq', ent: 'dir', via: [[1035, '@f'], [1035, '@p']] },
  { f: ['negociacao', 'moto_id'], p: ['moto', 'id'], sai: 'esq', ent: 'dir', via: [[1065, '@f'], [1065, '@p']] },
  { f: ['negociacao', 'vendedor_id'], p: ['funcionario', 'id'], sai: 'esq', ent: 'dir', via: [[1095, '@f'], [1095, '@p']] },
  { f: ['negociacao_historico', 'negociacao_id'], p: ['negociacao', 'id'], sai: 'esq', ent: 'esq', via: [[1125, '@f'], [1125, '@p']] },
  { f: ['negociacao_historico', 'usuario_id'], p: ['usuario', 'id'], sai: 'esq', ent: 'dir',
    via: [[1150, '@f'], [1150, 1400], [462, 1400], [462, '@p']] },
  { f: ['contrato', 'negociacao_id'], p: ['negociacao', 'id'], sai: 'dir', ent: 'dir', via: [[2180, '@f'], [2180, '@p']] },
  { f: ['contrato', 'cliente_id'], p: ['cliente', 'id'], sai: 'esq', ent: 'dir',
    via: [[1620, '@f'], [1620, 1440], [1128, 1440], [1128, '@p']] },
  { f: ['contrato', 'moto_id'], p: ['moto', 'id'], sai: 'esq', ent: 'dir',
    via: [[1650, '@f'], [1650, 1480], [1010, 1480], [1010, '@p']] },
  { f: ['contrato', 'vendedor_id'], p: ['funcionario', 'id'], sai: 'esq', ent: 'dir',
    via: [[1690, '@f'], [1688, 98], [1010, 98], [1010, '@p']] },
  { f: ['contrato', 'cancelado_por'], p: ['usuario', 'id'], sai: 'esq', ent: 'dir',
    via: [[1715, '@f'], [1712, 72], [440, 72], [440, '@p']] },
  { f: ['parcela', 'contrato_id'], p: ['contrato', 'id'], sai: 'dir', ent: 'dir', via: [[2180, '@f'], [2180, '@p']] },
  { f: ['cobranca', 'parcela_id'], p: ['parcela', 'id'], sai: 'dir', ent: 'dir', via: [[2240, '@f'], [2240, '@p']] },
  { f: ['cobranca', 'autorizado_por'], p: ['usuario', 'id'], sai: 'esq', ent: 'dir',
    via: [[1700, '@f'], [1700, 1520], [492, 1520], [492, '@p']] },
  { f: ['chamado', 'cliente_id'], p: ['cliente', 'id'], sai: 'esq', ent: 'dir', via: [[1015, '@f'], [1015, '@p']] },
  { f: ['chamado', 'moto_id'], p: ['moto', 'id'], sai: 'esq', ent: 'dir', via: [[985, '@f'], [985, '@p']] },
  { f: ['chamado', 'responsavel_id'], p: ['funcionario', 'id'], sai: 'esq', ent: 'dir', via: [[1155, '@f'], [1155, '@p']] },
];

function desenhaLigacoes() {
  let s = '';
  const usados = {};
  for (const l of C) {
    const [tf, cf] = l.f, [tp, cp] = l.p;
    const yf = linhaY(tf, cf);
    const chave = tp + cp;
    usados[chave] = (usados[chave] || 0) + 1;
    const yp = linhaY(tp, cp) + (((usados[chave] - 1) % 3) - 1) * 6;
    const inicio = [l.sai === 'dir' ? dir(tf) : esq(tf), yf];
    const fim = [l.ent === 'dir' ? dir(tp) : esq(tp), yp];
    const pontos = [inicio];
    for (const v of l.via) pontos.push([v[0], v[1] === '@f' ? yf : (v[1] === '@p' ? yp : v[1])]);
    pontos.push(fim);
    s += '<polyline points="' + pontos.map((q) => q[0] + ',' + q[1]).join(' ') + '" fill="none" stroke="#4A6FA5" stroke-width="1.8"/>';
    s += '<text x="' + (inicio[0] + (l.sai === 'dir' ? 16 : -16)) + '" y="' + (yf - 8) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#0F3D91">N</text>';
    s += '<text x="' + (fim[0] + (l.ent === 'dir' ? 14 : -14)) + '" y="' + (yp - 8) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#0F3D91">1</text>';
    s += '<circle cx="' + inicio[0] + '" cy="' + yf + '" r="4" fill="#4A6FA5"/><circle cx="' + fim[0] + '" cy="' + yp + '" r="4" fill="#4A6FA5"/>';
  }
  return s;
}

export function figuraLogico() {
  const tabelas = Object.keys(TABELAS).map(desenhaTabela).join('');
  const legenda = '<text x="60" y="1585" font-size="17" fill="#3D3A33">'
    + 'PK = chave primaria (sublinhada)    |    FK = chave estrangeira (em italico)    |    UK = chave unica    |    '
    + 'AK = unica dentro do contrato    |    1 : N = um para muitos</text>';
  return pagina({
    largura: 2340, altura: 1620,
    titulo: 'Figura 9 - Modelo Logico (relacional) - Sistema Marelo Motos',
    corpo: desenhaLigacoes() + tabelas + legenda,
  });
}

export const FKS = C;
