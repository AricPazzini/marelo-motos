// =====================================================================
//  der-conceitual.js - Modelo Conceitual (DER) do sistema Marelo Motos
//  Notacao Heuser / BrModelo, como usada em Banco de Dados I.
// =====================================================================
import { entidade, relacionamento, pernas, atributo, pagina } from './desenho-der.js';

const E = {
  FERIAS:        { x: 170,  y: 180 },
  FUNCIONARIO:   { x: 170,  y: 580 },
  USUARIO:       { x: 170,  y: 980 },
  LOG_ACESSO:    { x: 185,  y: 1380, w: 250 },
  CLIENTE:       { x: 780,  y: 180 },
  NEGOCIACAO:    { x: 780,  y: 680 },
  HISTORICO_ETAPA: { x: 470, y: 1080, w: 330 },
  MOTOCICLETA:   { x: 790,  y: 1450, w: 250 },
  CONTRATO:      { x: 1450, y: 680 },
  PARCELA:       { x: 2090, y: 680, fraca: true },
  COBRANCA:      { x: 2090, y: 1060 },
  CHAMADO:       { x: 1450, y: 1390 },
  PARAMETRO:     { x: 2090, y: 1390 },
};

const R = [
  { x: 170, y: 380, nome: 'programa', p: [
      { ent: 'FUNCIONARIO', card: '(1,1)' }, { ent: 'FERIAS', card: '(0,n)' } ] },
  { x: 170, y: 780, nome: 'acessa por', p: [
      { ent: 'FUNCIONARIO', card: '(1,1)' }, { ent: 'USUARIO', card: '(0,1)' } ] },
  { x: 172, y: 1180, nome: 'registra', p: [
      { ent: 'USUARIO', card: '(0,1)' }, { ent: 'LOG_ACESSO', card: '(0,n)' } ] },
  { x: 480, y: 370, nome: 'atende', p: [
      { ent: 'FUNCIONARIO', card: '(0,1)', recuo: 95 }, { ent: 'CLIENTE', card: '(0,n)' } ] },
  { x: 480, y: 645, nome: 'conduz', p: [
      { ent: 'FUNCIONARIO', card: '(1,1)', lado: -1, recuo: 62 }, { ent: 'NEGOCIACAO', card: '(0,n)' } ] },
  { x: 780, y: 430, nome: 'participa de', p: [
      { ent: 'CLIENTE', card: '(1,1)', recuo: 46 }, { ent: 'NEGOCIACAO', card: '(0,n)' } ] },
  { x: 620, y: 880, nome: 'registra etapa', p: [
      { ent: 'NEGOCIACAO', card: '(1,1)' }, { ent: 'HISTORICO_ETAPA', card: '(1,n)' } ] },
  { x: 790, y: 1060, nome: 'interessa', p: [
      { ent: 'NEGOCIACAO', card: '(0,n)' }, { ent: 'MOTOCICLETA', card: '(0,1)', recuo: 56 } ] },
  { x: 1115, y: 680, nome: 'origina', p: [
      { ent: 'NEGOCIACAO', card: '(0,1)' }, { ent: 'CONTRATO', card: '(0,1)' } ] },
  { x: 1090, y: 430, nome: 'assina', p: [
      { ent: 'CLIENTE', card: '(1,1)', recuo: 78 }, { ent: 'CONTRATO', card: '(0,n)', recuo: 52, dx: -48 } ] },
  { x: 1190, y: 190, nome: 'vende', p: [
      { ent: 'FUNCIONARIO', card: '(1,1)', lado: -1, recuo: 150 }, { ent: 'CONTRATO', card: '(0,n)', lado: -1, recuo: 60, dx: 62 } ] },
  { x: 1120, y: 1065, nome: 'e vendida em', p: [
      { ent: 'MOTOCICLETA', card: '(1,1)', recuo: 90, lado: -1 }, { ent: 'CONTRATO', card: '(0,1)', lado: -1 } ] },
  { x: 1770, y: 680, nome: 'gera', dupla: true, w: 150, p: [
      { ent: 'CONTRATO', card: '(1,1)' }, { ent: 'PARCELA', card: '(1,n)' } ] },
  { x: 2090, y: 880, nome: 'aciona', p: [
      { ent: 'PARCELA', card: '(1,1)' }, { ent: 'COBRANCA', card: '(0,n)' } ] },
  { x: 1860, y: 1120, nome: 'abre', p: [
      { ent: 'CLIENTE', card: '(1,1)', via: [[1860, 110], [780, 110]], lado: -1 },
      { ent: 'CHAMADO', card: '(0,n)' } ] },
  { x: 1120, y: 1420, nome: 'motiva', p: [
      { ent: 'MOTOCICLETA', card: '(0,1)' }, { ent: 'CHAMADO', card: '(0,n)' } ] },
  { x: 1120, y: 1555, nome: 'responde', p: [
      { ent: 'FUNCIONARIO', card: '(0,1)', via: [[32, 1555], [32, 580]], lado: -1, recuo: 20 },
      { ent: 'CHAMADO', card: '(0,n)', lado: -1 } ] },
];

export function figuraConceitualGeral() {
  let linhas = '', formas = '', losangos = '';
  for (const r of R) {
    linhas += pernas(r, r.p, E);
    losangos += relacionamento({ x: r.x, y: r.y, nome: r.nome, dupla: r.dupla, w: r.w });
  }
  for (const [nome, e] of Object.entries(E)) {
    formas += entidade({ x: e.x, y: e.y, nome, w: e.w, h: e.h, fraca: e.fraca });
  }
  const nota = '<text x="2090" y="1455" text-anchor="middle" font-size="13.5" fill="#5C574C">entidade independente (configuracao)</text>';
  return pagina({
    largura: 2400, altura: 1620, titulo: 'Figura 1 - Modelo Conceitual (DER) - Sistema Marelo Motos',
    corpo: linhas + formas + losangos + nota,
  });
}

export function figuraLegenda() {
  let c = '';
  const y1 = 110, y2 = 320;
  c += entidade({ x: 200, y: y1, nome: 'ENTIDADE', w: 250, h: 74 });
  c += entidade({ x: 560, y: y1, nome: 'FRACA', w: 230, h: 74, fraca: true });
  c += relacionamento({ x: 920, y: y1, nome: 'relacionamento', w: 250, h: 88 });
  c += '<text x="1120" y="' + (y1 + 7) + '" font-size="20" font-weight="700" fill="#0F3D91">(min, max)</text>';
  c += '<text x="1350" y="' + (y1 + 7) + '" font-size="18" fill="#3D3A33">cardinalidade (minima, maxima)</text>';
  c += atributo({ x: 240, y: y2, nome: 'identificador', tipo: 'chave', de: [90, y2] });
  c += atributo({ x: 600, y: y2, nome: 'comum', tipo: 'comum', de: [470, y2] });
  c += atributo({ x: 920, y: y2, nome: 'derivado', tipo: 'derivado', de: [790, y2] });
  c += atributo({ x: 1290, y: y2, nome: 'multivalorado', tipo: 'multi', de: [1130, y2] });
  const legenda = [
    'Entidade = retangulo   |   entidade fraca = retangulo duplo   |   relacionamento = losango   |   atributo = elipse',
    'Bolinha preenchida = atributo identificador (chave)   |   bolinha vazia = atributo comum   |   elipse tracejada = atributo derivado',
    'A cardinalidade escrita ao lado de uma entidade responde: uma ocorrencia da OUTRA entidade se relaciona com quantas ocorrencias DESTA?',
  ];
  c += legenda.map((t, i) => '<text x="60" y="' + (440 + i * 32) + '" font-size="19" fill="#3D3A33">' + t + '</text>').join('');
  return pagina({ largura: 1660, altura: 560, corpo: c });
}
