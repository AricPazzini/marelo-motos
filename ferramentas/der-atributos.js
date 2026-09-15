// =====================================================================
//  der-atributos.js - Modelo Conceitual: atributos de cada entidade
//  (mesma notacao Heuser / BrModelo da Figura 1)
// =====================================================================
import { entidadeComAtributos, pagina } from './desenho-der.js';

const a = (nome, tipo = 'comum') => ({ nome, tipo });

export const ATRIBUTOS = {
  CLIENTE: [a('cod_cliente', 'chave'), a('nome'), a('cpf'), a('telefone'), a('email'),
            a('cidade'), a('origem'), a('data_cadastro')],
  NEGOCIACAO: [a('cod_negociacao', 'chave'), a('etapa'), a('valor_negociado'), a('motivo_perda'),
               a('data_abertura'), a('data_atualizacao')],
  HISTORICO_ETAPA: [a('cod_historico', 'chave'), a('etapa_de'), a('etapa_para'), a('responsavel'), a('momento')],
  MOTOCICLETA: [a('codigo', 'chave'), a('marca'), a('modelo'), a('ano'), a('cor'), a('placa'),
                a('chassi'), a('km'), a('tipo'), a('custo'), a('preco_venda'), a('data_entrada'),
                a('data_saida'), a('situacao'), a('dias_patio', 'derivado'), a('margem', 'derivado')],
  CHAMADO: [a('numero', 'chave'), a('assunto'), a('descricao'), a('data_abertura'),
            a('ultima_movimentacao'), a('data_conclusao'), a('situacao')],
  CONTRATO: [a('numero', 'chave'), a('forma_pagamento'), a('valor_total'), a('valor_entrada'),
             a('qtd_parcelas'), a('banco'), a('data_emissao'), a('situacao'), a('motivo_cancelamento')],
  PARCELA: [a('numero', 'parcial'), a('valor'), a('vencimento'), a('data_pagamento'),
            a('situacao'), a('dias_atraso', 'derivado')],
  COBRANCA: [a('cod_cobranca', 'chave'), a('tipo'), a('canal'), a('observacao'), a('momento')],
  FUNCIONARIO: [a('cod_funcionario', 'chave'), a('nome'), a('cpf'), a('cargo'), a('setor'),
                a('data_admissao'), a('data_desligamento'), a('salario'), a('percentual_comissao'),
                a('meta_mensal'), a('situacao')],
  FERIAS: [a('cod_ferias', 'chave'), a('data_inicio'), a('data_fim'), a('situacao')],
  USUARIO: [a('cod_usuario', 'chave'), a('email'), a('senha'), a('perfil'), a('ativo'), a('criado_em')],
  LOG_ACESSO: [a('cod_log', 'chave'), a('email_informado'), a('sucesso'), a('momento')],
  PARAMETRO: [a('chave', 'chave'), a('valor'), a('descricao')],
};

function monta({ largura, altura, titulo, entidades }) {
  const corpo = entidades.map((e) => entidadeComAtributos({
    x: e.x, y: e.y, nome: e.nome, atributos: ATRIBUTOS[e.nome], fraca: e.fraca,
    w: e.w || Math.max(270, e.nome.length * 20), raios: e.raios || [250, 360],
    de: e.de ?? -90, ate: e.ate ?? 270,
  })).join('');
  return pagina({ largura, altura, titulo, corpo });
}

export function figura2Motocicleta() {
  return monta({
    largura: 1500, altura: 1420, titulo: 'Figura 2 - Atributos da entidade MOTOCICLETA',
    entidades: [{ nome: 'MOTOCICLETA', x: 750, y: 740, raios: [300, 450], w: 330 }],
  });
}

export function figura3Funcionario() {
  return monta({
    largura: 1500, altura: 1420, titulo: 'Figura 3 - Atributos da entidade FUNCIONARIO',
    entidades: [{ nome: 'FUNCIONARIO', x: 750, y: 740, raios: [290, 430], w: 340 }],
  });
}

export function figura4ClienteNegociacao() {
  return monta({
    largura: 1500, altura: 1980, titulo: 'Figura 4 - Atributos das entidades CLIENTE e NEGOCIACAO',
    entidades: [
      { nome: 'CLIENTE', x: 750, y: 520 },
      { nome: 'NEGOCIACAO', x: 750, y: 1460, w: 310 },
    ],
  });
}

export function figura5ChamadoHistorico() {
  return monta({
    largura: 1500, altura: 1980, titulo: 'Figura 5 - Atributos das entidades CHAMADO e HISTORICO_ETAPA',
    entidades: [
      { nome: 'CHAMADO', x: 750, y: 520 },
      { nome: 'HISTORICO_ETAPA', x: 750, y: 1460, w: 400 },
    ],
  });
}

export function figura6ContratoParcela() {
  return monta({
    largura: 1500, altura: 1980, titulo: 'Figura 6 - Atributos das entidades CONTRATO e PARCELA',
    entidades: [
      { nome: 'CONTRATO', x: 750, y: 520 },
      { nome: 'PARCELA', x: 750, y: 1460, fraca: true },
    ],
  });
}

export function figura7UsuarioCobranca() {
  return monta({
    largura: 1500, altura: 1980, titulo: 'Figura 7 - Atributos das entidades USUARIO e COBRANCA',
    entidades: [
      { nome: 'USUARIO', x: 750, y: 520 },
      { nome: 'COBRANCA', x: 750, y: 1460 },
    ],
  });
}

export function figura8Apoio() {
  return monta({
    largura: 1500, altura: 2030, titulo: 'Figura 8 - Atributos das entidades FERIAS, LOG_ACESSO e PARAMETRO',
    entidades: [
      { nome: 'FERIAS', x: 750, y: 380, raios: [215, 300] },
      { nome: 'LOG_ACESSO', x: 750, y: 1030, raios: [215, 300], w: 310 },
      { nome: 'PARAMETRO', x: 750, y: 1670, raios: [215, 300], w: 310 },
    ],
  });
}
