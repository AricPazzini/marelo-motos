-- =====================================================================
--  MARELO MOTOS - Carga inicial de dados
--
--  ATENCAO: todos os dados deste arquivo sao FICTICIOS, criados apenas
--  para o prototipo. Os valores reais serao substituidos apos a visita
--  a loja (ver "PERGUNTAS PARA A VISITA - MARELO MOTOS").
--
--  As datas sao sempre relativas a date('now') para que o prototipo
--  nunca fique desatualizado, independentemente do dia do teste.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARAMETROS DA LOJA
-- ---------------------------------------------------------------------
INSERT INTO parametro (chave, valor, descricao) VALUES
  ('loja_nome',            'Marelo Motos',      'Nome fantasia exibido no sistema'),
  ('loja_cidade',          'Itapetininga - SP', 'Unidade padrao'),
  ('comissao_padrao',      '3',                 'Percentual de comissao sobre a venda (RNFR-07.3)'),
  ('alerta_dias_patio',    '90',                'Dias de patio que disparam alerta (RNFR-03.2)'),
  ('alerta_dias_chamado',  '5',                 'Dias sem movimentacao que marcam o chamado como atrasado (RNFR-02.1)'),
  ('desconto_livre_max',   '5',                 'Desconto maximo que o vendedor concede sem o Dono'),
  ('regua_lembrete',       '3',                 'Dias ANTES do vencimento para o lembrete (RF-05)'),
  ('regua_segunda_via',    '1',                 'Dias APOS o vencimento para a segunda via'),
  ('regua_contato',        '7',                 'Dias APOS o vencimento para o contato do financeiro'),
  ('regua_negativacao',    '15',                'Dias APOS o vencimento para propor negativacao');

-- ---------------------------------------------------------------------
-- FUNCIONARIOS  (RF-06) - equipe de nove pessoas descrita no documento
-- ---------------------------------------------------------------------
INSERT INTO funcionario (nome, cpf, cargo, setor, data_admissao, salario, percentual_comissao, meta_mensal, situacao) VALUES
  ('Marcelo Marelo',    '770.710.320-33', 'Proprietario',            'administrativo', '2012-03-01', 0.00,    0.0,  0,  'ativo'),
  ('Rodrigo Alves',     '929.927.201-86', 'Vendedor',                'comercial',      '2021-02-15', 1800.00, 3.0,  12, 'ativo'),
  ('Patricia Nunes',    '162.122.370-18', 'Vendedora',               'comercial',      '2022-06-01', 1800.00, 3.0,  12, 'ativo'),
  ('Wesley Souza',      '618.095.184-58', 'Vendedor',                'comercial',      '2023-09-11', 1800.00, 3.0,  10, 'ativo'),
  ('Claudia Bertoldo',  '846.541.536-67', 'Analista financeiro',     'financeiro',     '2019-04-02', 3200.00, 0.0,  0,  'ativo'),
  ('Sergio Matias',     '006.860.773-34', 'Auxiliar administrativo', 'administrativo', '2020-08-17', 2400.00, 0.0,  0,  'ativo'),
  ('Everton Pires',     '585.370.800-71', 'Mecanico',                'oficina',        '2018-01-22', 2900.00, 0.0,  0,  'ativo'),
  ('Jonas Ferreira',    '784.295.874-20', 'Auxiliar de oficina',     'oficina',        '2024-03-04', 2100.00, 0.0,  0,  'ativo'),
  ('Beatriz Lima',      '942.846.002-81', 'Recepcao e pos-venda',    'administrativo', '2025-05-19', 2000.00, 0.0,  0,  'ativo');

-- Ferias programadas (RNFR-06.2: o sistema avisa com 30 dias de antecedencia)
INSERT INTO ferias (funcionario_id, data_inicio, data_fim, situacao) VALUES
  (2, date('now','localtime','+19 days'), date('now','localtime','+33 days'), 'programada'),
  (7, date('now','localtime','+58 days'), date('now','localtime','+72 days'), 'programada'),
  (3, date('now','localtime','-95 days'), date('now','localtime','-81 days'), 'concluida');

-- ---------------------------------------------------------------------
-- USUARIOS  (RNFS-01)
-- A coluna senha_hash entra como 'DEFINIR': o servidor gera o hash
-- scrypt no primeiro carregamento (ver servidor/banco.js). Senha de
-- todos no prototipo: marelo123
-- ---------------------------------------------------------------------
INSERT INTO usuario (email, senha_hash, perfil, funcionario_id) VALUES
  ('marcelo@marelomotos.com.br', 'DEFINIR', 'dono',        1),
  ('rodrigo@marelomotos.com.br', 'DEFINIR', 'funcionario', 2),
  ('patricia@marelomotos.com.br','DEFINIR', 'funcionario', 3),
  ('wesley@marelomotos.com.br',  'DEFINIR', 'funcionario', 4),
  ('claudia@marelomotos.com.br', 'DEFINIR', 'funcionario', 5);

-- ---------------------------------------------------------------------
-- ESTOQUE  (RF-03) - motos disponiveis no patio
-- ---------------------------------------------------------------------
INSERT INTO moto (codigo, marca, modelo, ano, cor, placa, km, tipo, custo, preco_venda, data_entrada, situacao) VALUES
  ('MM-0212','Yamaha','Crosser 150',    2024,'Preta',    'AZX-9G28',  4200,'seminova',15300.00,18700.00, date('now','localtime','-6 days'),  'reservada'),
  ('MM-0217','Honda', 'Pop 110i',       2022,'Vermelha', 'BNM-5F63', 18400,'seminova', 8200.00,10200.00, date('now','localtime','-41 days'), 'disponivel'),
  ('MM-0219','Yamaha','Factor 150',     2023,'Prata',    'CVB-2D74',  9800,'seminova',12100.00,15900.00, date('now','localtime','-9 days'),  'preparacao'),
  ('MM-0224','Honda', 'XRE 300',        2021,'Branca',   'DKL-7C31', 31200,'seminova',23100.00,28500.00, date('now','localtime','-96 days'), 'disponivel'),
  ('MM-0228','Yamaha','Fazer 250',      2022,'Azul',     'EQP-1A55', 22700,'seminova',18400.00,22900.00, date('now','localtime','-37 days'), 'disponivel'),
  ('MM-0230','Honda', 'Biz 125',        2023,'Vermelha', 'FTR-8B90', 12500,'seminova',10800.00,13400.00, date('now','localtime','-22 days'), 'reservada'),
  ('MM-0231','Honda', 'CG 160 Titan',   2024,'Preta',    'GHJ-4E12',  3100,'seminova',12900.00,16200.00, date('now','localtime','-14 days'), 'disponivel'),
  ('MM-0232','Honda', 'CG 160 Fan',     2023,'Prata',    'HIJ-2K45', 15900,'seminova',11500.00,14300.00, date('now','localtime','-103 days'),'disponivel'),
  ('MM-0233','Honda', 'Biz 110i',       2024,'Azul',     'JKL-6M77',  2400,'nova',    11200.00,13900.00, date('now','localtime','-18 days'), 'disponivel'),
  ('MM-0234','Yamaha','NMax 160',       2024,'Cinza',    'LMN-3P21',  5600,'seminova',21500.00,26400.00, date('now','localtime','-11 days'), 'disponivel'),
  ('MM-0235','Honda', 'PCX 160',        2023,'Preta',    'NOP-8Q54',  8900,'seminova',22300.00,27200.00, date('now','localtime','-27 days'), 'disponivel'),
  ('MM-0236','Yamaha','Factor 125',     2022,'Vermelha', 'PQR-4S18', 24100,'seminova', 9800.00,12400.00, date('now','localtime','-55 days'), 'disponivel'),
  ('MM-0237','Honda', 'XRE 190',        2024,'Vermelha', 'RST-7U92',  1900,'nova',    19400.00,23800.00, date('now','localtime','-4 days'),  'preparacao'),
  ('MM-0238','Honda', 'CG 160 Start',   2023,'Preta',    'TUV-1W36', 13700,'seminova',10600.00,13200.00, date('now','localtime','-33 days'), 'disponivel'),
  ('MM-0239','Yamaha','Lander 250',     2021,'Azul',     'VWX-9Y71', 29800,'seminova',20100.00,24900.00, date('now','localtime','-68 days'), 'disponivel'),
  ('MM-0240','Honda', 'Elite 125',      2024,'Branca',   'XYZ-5Z14',   800,'nova',    12800.00,15600.00, date('now','localtime','-2 days'),  'disponivel');

-- Motos ja vendidas: alimentam o historico, o faturamento e a comissao
INSERT INTO moto (codigo, marca, modelo, ano, cor, placa, km, tipo, custo, preco_venda, data_entrada, data_saida, situacao) VALUES
  ('MM-0198','Honda', 'CG 160 Titan', 2023,'Preta',   'AAB-1C23', 11200,'seminova',12400.00,15800.00, date('now','localtime','-120 days'), date('now','localtime','-75 days'), 'vendida'),
  ('MM-0201','Honda', 'Biz 125',      2022,'Vermelha','BBC-2D34', 19500,'seminova',10300.00,13100.00, date('now','localtime','-110 days'), date('now','localtime','-70 days'), 'vendida'),
  ('MM-0203','Yamaha','Fazer 250',    2021,'Azul',    'CCD-3E45', 27300,'seminova',17800.00,22100.00, date('now','localtime','-100 days'), date('now','localtime','-62 days'), 'vendida'),
  ('MM-0205','Honda', 'Pop 110i',     2023,'Preta',   'DDE-4F56',  9100,'seminova', 8400.00,10500.00, date('now','localtime','-95 days'),  date('now','localtime','-48 days'), 'vendida'),
  ('MM-0207','Yamaha','Crosser 150',  2023,'Preta',   'EEF-5G67', 14800,'seminova',15000.00,18300.00, date('now','localtime','-88 days'),  date('now','localtime','-40 days'), 'vendida'),
  ('MM-0209','Honda', 'XRE 300',      2022,'Vermelha','FFG-6H78', 25600,'seminova',22800.00,28100.00, date('now','localtime','-80 days'),  date('now','localtime','-20 days'), 'vendida'),
  ('MM-0210','Honda', 'CG 160 Fan',   2024,'Prata',   'GGH-7I89',  4300,'seminova',11800.00,14700.00, date('now','localtime','-70 days'),  date('now','localtime','-21 days'), 'vendida'),
  ('MM-0213','Honda', 'Biz 125',      2024,'Azul',    'HHI-8J90',  3800,'nova',    11000.00,13400.00, date('now','localtime','-60 days'),  date('now','localtime','-18 days'), 'vendida'),
  ('MM-0215','Yamaha','Factor 150',   2022,'Prata',   'IIJ-9K01', 21400,'seminova',11900.00,15400.00, date('now','localtime','-55 days'),  date('now','localtime','-15 days'), 'vendida'),
  ('MM-0216','Honda', 'PCX 160',      2022,'Branca',  'JJK-1L12', 17900,'seminova',21800.00,26800.00, date('now','localtime','-50 days'),  date('now','localtime','-12 days'), 'vendida'),
  ('MM-0220','Honda', 'CG 160 Titan', 2024,'Vermelha','KKL-2M23',  2900,'nova',    12900.00,16200.00, date('now','localtime','-45 days'),  date('now','localtime','-8 days'),  'vendida'),
  ('MM-0222','Yamaha','NMax 160',     2023,'Cinza',   'LLM-3N34',  7600,'seminova',21200.00,25900.00, date('now','localtime','-40 days'),  date('now','localtime','-5 days'),  'vendida'),
  ('MM-0225','Honda', 'Biz 110i',     2023,'Vermelha','MMN-4O45', 10200,'seminova',10900.00,13600.00, date('now','localtime','-35 days'),  date('now','localtime','-3 days'),  'vendida'),
  -- Vendas do ano anterior
  ('MM-0142','Yamaha','Fazer 250',    2020,'Preta',   'NNO-5P56', 33400,'seminova',14200.00,17900.00, date('now','localtime','-360 days'), date('now','localtime','-320 days'),'vendida'),
  ('MM-0148','Honda', 'XRE 300',      2020,'Azul',    'OOP-6Q67', 38700,'seminova',17100.00,21400.00, date('now','localtime','-330 days'), date('now','localtime','-290 days'),'vendida'),
  ('MM-0155','Honda', 'CG 160 Fan',   2021,'Vermelha','PPQ-7R78', 22800,'seminova',10200.00,12800.00, date('now','localtime','-300 days'), date('now','localtime','-260 days'),'vendida');

-- ---------------------------------------------------------------------
-- CLIENTES  (RF-01) - distribuidos entre as carteiras (RNFR-01.1)
-- ---------------------------------------------------------------------
INSERT INTO cliente (nome, cpf, telefone, email, cidade, origem, vendedor_id) VALUES
  ('Carlos Menezes',    '198.059.993-94', '(15) 99712-4408', 'carlos.menezes@email.com',  'Itapetininga', 'Loja',      2),
  ('Juliana Prado',     '660.338.826-01', '(15) 99833-1276', 'juliana.prado@email.com',   'Itapetininga', 'Instagram', 2),
  ('Marcos Vinicius',   '858.023.074-80', '(15) 99145-7730', 'marcos.v@email.com',        'Sorocaba',     'Instagram', 2),
  ('Elaine Ribeiro',    '038.471.439-05', '(15) 99620-3391', 'elaine.ribeiro@email.com',  'Itapetininga', 'Instagram', 2),
  ('Fabio Nogueira',    '556.060.900-58', '(15) 99408-8852', 'fabio.nogueira@email.com',  'Tatui',        'Indicacao', 2),
  ('Renata Cardoso',    '798.427.931-41', '(15) 99277-6014', 'renata.cardoso@email.com',  'Itapetininga', 'Indicacao', 3),
  ('Diego Ramos',       '975.761.448-31', '(15) 99530-2287', 'diego.ramos@email.com',     'Capao Bonito', 'Loja',      3),
  ('Sandra Kobayashi',  '180.358.945-01', '(11) 98844-5590', 'sandra.k@email.com',        'Sao Paulo',    'Site',      3),
  ('Paulo Serrano',     '637.719.177-43', '(15) 99361-7723', 'paulo.serrano@email.com',   'Itapetininga', 'Indicacao', 3),
  ('Tatiane Lopes',     '888.164.083-08', '(15) 99019-4465', 'tatiane.lopes@email.com',   'Itapetininga', 'Loja',      3),
  ('Anderson Faria',    '027.837.182-51', '(15) 99752-9038', 'anderson.faria@email.com',  'Sorocaba',     'Site',      4),
  ('Vanessa Toledo',    '510.308.472-40', '(15) 99586-1194', 'vanessa.toledo@email.com',  'Itapetininga', 'Instagram', 4),
  ('Rafael Bicudo',     '701.255.690-09', '(11) 97733-2251', 'rafael.bicudo@email.com',   'Sao Paulo',    'Site',      4),
  ('Camila Nascimento', '969.438.074-04', '(15) 99204-6687', 'camila.n@email.com',        'Tatui',        'Indicacao', 4),
  ('Joao Batista Reis', '173.632.917-05', '(15) 99871-3320', 'joao.reis@email.com',       'Itapetininga', 'Loja',      4);

-- ---------------------------------------------------------------------
-- FUNIL DE VENDAS  (RF-01) - negociacoes em andamento
-- ---------------------------------------------------------------------
INSERT INTO negociacao (cliente_id, moto_id, vendedor_id, etapa, valor_negociado, criado_em) VALUES
  ( 4, (SELECT id FROM moto WHERE codigo='MM-0219'), 2, 'lead',          15900.00, datetime('now','localtime','-2 days')),
  ( 9, (SELECT id FROM moto WHERE codigo='MM-0233'), 3, 'lead',          13900.00, datetime('now','localtime','-3 days')),
  (10, (SELECT id FROM moto WHERE codigo='MM-0217'), 3, 'lead',          10200.00, datetime('now','localtime','-1 days')),
  (15, (SELECT id FROM moto WHERE codigo='MM-0238'), 4, 'lead',          13200.00, datetime('now','localtime','-4 days')),
  ( 2, (SELECT id FROM moto WHERE codigo='MM-0230'), 2, 'contato',       13400.00, datetime('now','localtime','-7 days')),
  ( 7, (SELECT id FROM moto WHERE codigo='MM-0212'), 3, 'contato',       18700.00, datetime('now','localtime','-6 days')),
  (12, (SELECT id FROM moto WHERE codigo='MM-0236'), 4, 'contato',       12400.00, datetime('now','localtime','-9 days')),
  ( 3, (SELECT id FROM moto WHERE codigo='MM-0228'), 2, 'proposta',      22900.00, datetime('now','localtime','-11 days')),
  ( 8, (SELECT id FROM moto WHERE codigo='MM-0224'), 3, 'proposta',      28500.00, datetime('now','localtime','-13 days')),
  (13, (SELECT id FROM moto WHERE codigo='MM-0235'), 4, 'proposta',      27200.00, datetime('now','localtime','-8 days')),
  (11, (SELECT id FROM moto WHERE codigo='MM-0234'), 4, 'financiamento', 26400.00, datetime('now','localtime','-15 days')),
  (14, (SELECT id FROM moto WHERE codigo='MM-0239'), 4, 'financiamento', 24900.00, datetime('now','localtime','-12 days')),
  ( 6, (SELECT id FROM moto WHERE codigo='MM-0240'), 3, 'financiamento', 15600.00, datetime('now','localtime','-5 days')),
  ( 5, (SELECT id FROM moto WHERE codigo='MM-0237'), 2, 'perdida',       23800.00, datetime('now','localtime','-20 days'));

UPDATE negociacao SET motivo_perda = 'Cliente fechou com a concorrencia' WHERE etapa = 'perdida';

-- Historico inicial do funil (RF-01: data e responsavel em cada mudanca)
INSERT INTO negociacao_historico (negociacao_id, etapa_de, etapa_para, responsavel, momento)
SELECT n.id, NULL, 'lead', f.nome, n.criado_em
FROM negociacao n JOIN funcionario f ON f.id = n.vendedor_id;

INSERT INTO negociacao_historico (negociacao_id, etapa_de, etapa_para, responsavel, momento)
SELECT n.id, 'lead', n.etapa, f.nome, datetime(n.criado_em, '+1 days')
FROM negociacao n JOIN funcionario f ON f.id = n.vendedor_id
WHERE n.etapa <> 'lead';

-- ---------------------------------------------------------------------
-- CONTRATOS  (RF-04) - vendas ja fechadas
-- ---------------------------------------------------------------------
INSERT INTO contrato (numero, cliente_id, moto_id, vendedor_id, forma_pagamento, valor_total, valor_entrada, qtd_parcelas, banco, data_emissao) VALUES
  -- Vendas do ano anterior: sustentam o historico e a inadimplencia antiga
  ('CT-2025-0088', 4, (SELECT id FROM moto WHERE codigo='MM-0142'), 2, 'financiado',       17900.00,  2500.00, 36, 'Itau',     date('now','localtime','-320 days')),
  ('CT-2025-0091', 9, (SELECT id FROM moto WHERE codigo='MM-0148'), 3, 'financiado',       21400.00,  3000.00, 36, 'Santander',date('now','localtime','-290 days')),
  ('CT-2025-0095',11, (SELECT id FROM moto WHERE codigo='MM-0155'), 4, 'financiado',       12800.00,  1800.00, 24, 'Banco Pan',date('now','localtime','-260 days')),
  ('CT-2026-0001', 1, (SELECT id FROM moto WHERE codigo='MM-0198'), 2, 'avista',           15800.00,     0.00,  1, NULL,       date('now','localtime','-75 days')),
  ('CT-2026-0002', 5, (SELECT id FROM moto WHERE codigo='MM-0201'), 2, 'financiado',       13100.00,  2000.00, 24, 'Banco Pan',date('now','localtime','-70 days')),
  ('CT-2026-0003', 6, (SELECT id FROM moto WHERE codigo='MM-0203'), 3, 'financiado',       22100.00,  4000.00, 36, 'Santander',date('now','localtime','-62 days')),
  ('CT-2026-0004',10, (SELECT id FROM moto WHERE codigo='MM-0205'), 3, 'entrada_parcelas', 10500.00,  2500.00, 12, NULL,       date('now','localtime','-48 days')),
  ('CT-2026-0005', 7, (SELECT id FROM moto WHERE codigo='MM-0207'), 3, 'financiado',       18300.00,  3000.00, 24, 'Banco Pan',date('now','localtime','-40 days')),
  ('CT-2026-0006', 8, (SELECT id FROM moto WHERE codigo='MM-0209'), 3, 'avista',           28100.00,     0.00,  1, NULL,       date('now','localtime','-20 days')),
  ('CT-2026-0007',11, (SELECT id FROM moto WHERE codigo='MM-0210'), 4, 'financiado',       14700.00,  2000.00, 36, 'Itau',     date('now','localtime','-21 days')),
  ('CT-2026-0008',12, (SELECT id FROM moto WHERE codigo='MM-0213'), 4, 'financiado',       13400.00,  1500.00, 24, 'Santander',date('now','localtime','-18 days')),
  ('CT-2026-0009', 2, (SELECT id FROM moto WHERE codigo='MM-0215'), 2, 'entrada_parcelas', 15400.00,  3400.00, 10, NULL,       date('now','localtime','-15 days')),
  ('CT-2026-0010',13, (SELECT id FROM moto WHERE codigo='MM-0216'), 4, 'financiado',       26800.00,  5000.00, 48, 'Itau',     date('now','localtime','-12 days')),
  ('CT-2026-0011', 3, (SELECT id FROM moto WHERE codigo='MM-0220'), 2, 'financiado',       16200.00,  2000.00, 24, 'Banco Pan',date('now','localtime','-8 days')),
  ('CT-2026-0012',14, (SELECT id FROM moto WHERE codigo='MM-0222'), 4, 'avista',           25900.00,     0.00,  1, NULL,       date('now','localtime','-5 days')),
  ('CT-2026-0013',15, (SELECT id FROM moto WHERE codigo='MM-0225'), 4, 'financiado',       13600.00,  1600.00, 18, 'Santander',date('now','localtime','-3 days'));

-- Geracao das parcelas por SQL recursivo: uma linha para cada parcela do
-- contrato, com vencimento de 30 em 30 dias a partir da emissao (RF-04).
INSERT INTO parcela (contrato_id, numero, valor, vencimento)
WITH RECURSIVE serie(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM serie WHERE i < 48
)
SELECT
  c.id,
  s.i,
  ROUND((c.valor_total - c.valor_entrada) / c.qtd_parcelas, 2),
  date(c.data_emissao, '+' || s.i || ' months')
FROM contrato c
JOIN serie s ON s.i <= c.qtd_parcelas;

-- Venda a vista: o pagamento acontece no ato da emissao do contrato.
UPDATE parcela
   SET vencimento     = (SELECT c.data_emissao FROM contrato c WHERE c.id = parcela.contrato_id),
       situacao       = 'paga',
       data_pagamento = (SELECT c.data_emissao FROM contrato c WHERE c.id = parcela.contrato_id)
 WHERE contrato_id IN (SELECT id FROM contrato WHERE forma_pagamento = 'avista');

-- Na Marelo, o cliente quita a entrada e a primeira parcela no ato da
-- entrega da motocicleta. Por isso a parcela 1 ja nasce quitada — e e
-- ela que libera a comissao do vendedor (RNFR-07.1).
-- >> CONFIRMAR NA VISITA: pergunta 21 do roteiro de entrevista.
UPDATE parcela
   SET situacao = 'paga',
       data_pagamento = (SELECT c.data_emissao FROM contrato c WHERE c.id = parcela.contrato_id)
 WHERE numero = 1;

-- Baixa das demais parcelas ja vencidas
UPDATE parcela
   SET situacao = 'paga', data_pagamento = vencimento
 WHERE date(vencimento) < date('now','localtime')
   AND situacao <> 'paga';

-- Quatro clientes em atraso (RF-05): as parcelas vencidas continuam abertas
UPDATE parcela
   SET situacao = 'aberta', data_pagamento = NULL
 WHERE numero > 1
   AND date(vencimento) < date('now','localtime')
   AND contrato_id IN (
        SELECT id FROM contrato
         WHERE numero IN ('CT-2025-0088','CT-2025-0091','CT-2026-0002','CT-2026-0003')
   );

-- Um contrato recente ainda sem a primeira parcela quitada: serve para
-- demonstrar o RNFR-07.1 (venda que ainda NAO gera comissao).
UPDATE parcela
   SET situacao = 'aberta', data_pagamento = NULL
 WHERE numero = 1
   AND contrato_id = (SELECT id FROM contrato WHERE numero = 'CT-2026-0013');

-- Contratos a vista ja nascem quitados
UPDATE contrato SET situacao = 'quitado' WHERE forma_pagamento = 'avista';

-- Cobrancas ja executadas pela regua (RF-05)
INSERT INTO cobranca (parcela_id, tipo, canal, observacao, momento)
SELECT p.id, 'lembrete', 'whatsapp', 'Lembrete automatico enviado tres dias antes do vencimento',
       datetime(p.vencimento, '-3 days')
FROM parcela p
WHERE p.situacao = 'aberta' AND date(p.vencimento) < date('now','localtime');

INSERT INTO cobranca (parcela_id, tipo, canal, observacao, momento)
SELECT p.id, 'segunda_via', 'email', 'Segunda via do boleto enviada apos o vencimento',
       datetime(p.vencimento, '+1 days')
FROM parcela p
WHERE p.situacao = 'aberta'
  AND julianday(date('now','localtime')) - julianday(p.vencimento) > 1;

INSERT INTO cobranca (parcela_id, tipo, canal, observacao, momento)
SELECT p.id, 'contato', 'telefone', 'Contato do setor financeiro',
       datetime(p.vencimento, '+7 days')
FROM parcela p
WHERE p.situacao = 'aberta'
  AND julianday(date('now','localtime')) - julianday(p.vencimento) > 7;

-- ---------------------------------------------------------------------
-- SAC  (RF-02)
-- ---------------------------------------------------------------------
INSERT INTO chamado (numero, cliente_id, moto_id, assunto, descricao, responsavel_id, data_abertura, ultima_movimentacao, situacao, data_conclusao) VALUES
  ('#1039', 6, (SELECT id FROM moto WHERE codigo='MM-0203'), 'Segunda via do contrato',   'Cliente solicitou copia do contrato para o financiamento.', 2, date('now','localtime','-13 days'), date('now','localtime','-13 days'), 'andamento', NULL),
  ('#1040',10, (SELECT id FROM moto WHERE codigo='MM-0205'), 'Duvida sobre parcelas',     'Cliente pediu detalhamento das parcelas em aberto.',        5, date('now','localtime','-11 days'), date('now','localtime','-2 days'),  'andamento', NULL),
  ('#1041', 5, (SELECT id FROM moto WHERE codigo='MM-0201'), 'Revisao de garantia',       'Primeira revisao realizada na oficina.',                    7, date('now','localtime','-9 days'),  date('now','localtime','-6 days'),  'resolvido', date('now','localtime','-6 days')),
  ('#1042', 1, (SELECT id FROM moto WHERE codigo='MM-0198'), 'Emplacamento atrasado',     'Documento nao retornou do despachante.',                    3, date('now','localtime','-7 days'),  date('now','localtime','-1 days'),  'andamento', NULL),
  ('#1043',12, (SELECT id FROM moto WHERE codigo='MM-0213'), 'Barulho no freio traseiro', 'Cliente relatou ruido; agendada avaliacao na oficina.',      7, date('now','localtime','-4 days'),  date('now','localtime','-4 days'),  'andamento', NULL),
  ('#1044',14, (SELECT id FROM moto WHERE codigo='MM-0222'), 'Troca de titularidade',     'Orientacao sobre transferencia no Detran.',                  9, date('now','localtime','-2 days'),  date('now','localtime','-2 days'),  'andamento', NULL);
