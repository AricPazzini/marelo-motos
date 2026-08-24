-- =====================================================================
--  MARELO MOTOS - Sistema de Gestao
--  Estrutura do banco de dados (SQLite)
--
--  Projeto Integrador em ADS II - FATEC
--  Aric Proenca Pazzini e Lucas Belfort Darantes Medeiros
--
--  Cada tabela abaixo aponta o requisito da Documentacao de Sistema
--  que ela atende. Nao alterar sem atualizar o documento.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- FUNCIONARIOS  (RF-06)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funcionario (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                 TEXT    NOT NULL,
  cpf                  TEXT    NOT NULL UNIQUE,
  cargo                TEXT    NOT NULL,
  setor                TEXT    NOT NULL,           -- comercial | oficina | financeiro | administrativo
  data_admissao        TEXT    NOT NULL,           -- AAAA-MM-DD
  data_desligamento    TEXT,                       -- preenchida no desligamento (RNFR-06.3: registro nunca e apagado)
  salario              REAL    NOT NULL DEFAULT 0,
  percentual_comissao  REAL    NOT NULL DEFAULT 0, -- RNFR-07.3: parametrizavel por vendedor
  meta_mensal          INTEGER NOT NULL DEFAULT 0,
  situacao             TEXT    NOT NULL DEFAULT 'ativo'  -- ativo | ferias | desligado
                       CHECK (situacao IN ('ativo','ferias','desligado'))
);

-- Periodos de ferias (RF-06 / RNFR-06.2: aviso com 30 dias de antecedencia)
CREATE TABLE IF NOT EXISTS ferias (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  funcionario_id  INTEGER NOT NULL REFERENCES funcionario(id),
  data_inicio     TEXT    NOT NULL,
  data_fim        TEXT    NOT NULL,
  situacao        TEXT    NOT NULL DEFAULT 'programada'
                  CHECK (situacao IN ('programada','em_gozo','concluida'))
);

-- ---------------------------------------------------------------------
-- USUARIOS E ACESSO  (RNFS-01: login e senha individuais, perfil por usuario)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  senha_hash      TEXT    NOT NULL,               -- scrypt: salto:hash (nunca em texto puro)
  perfil          TEXT    NOT NULL CHECK (perfil IN ('dono','funcionario')),
  funcionario_id  INTEGER REFERENCES funcionario(id),
  ativo           INTEGER NOT NULL DEFAULT 1,
  criado_em       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Trilha de acesso ao sistema (apoio ao RNFS-01)
CREATE TABLE IF NOT EXISTS log_acesso (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER REFERENCES usuario(id),
  email       TEXT    NOT NULL,
  sucesso     INTEGER NOT NULL,
  momento     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- CLIENTES  (RF-01)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL,
  cpf          TEXT NOT NULL UNIQUE,   -- RNFR-01.2: CPF valido, conferido no servidor
  telefone     TEXT NOT NULL,          -- RNFR-01.2: ao menos um telefone
  email        TEXT,
  cidade       TEXT,
  origem       TEXT,                   -- Instagram | Indicacao | Loja | Site | Outro
  vendedor_id  INTEGER REFERENCES funcionario(id),  -- RNFR-01.1: carteira do vendedor
  observacao   TEXT,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- ESTOQUE DE MOTOCICLETAS  (RF-03)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moto (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo       TEXT    NOT NULL UNIQUE,  -- codigo interno da loja (MM-0231)
  marca        TEXT    NOT NULL,
  modelo       TEXT    NOT NULL,
  ano          INTEGER NOT NULL,
  cor          TEXT,
  placa        TEXT,
  chassi       TEXT,
  km           INTEGER NOT NULL DEFAULT 0,
  tipo         TEXT    NOT NULL DEFAULT 'seminova' CHECK (tipo IN ('nova','seminova')),
  custo        REAL    NOT NULL DEFAULT 0,
  preco_venda  REAL    NOT NULL DEFAULT 0,
  data_entrada TEXT    NOT NULL,          -- base do calculo de dias no patio (RNFR-03.1)
  data_saida   TEXT,
  situacao     TEXT    NOT NULL DEFAULT 'disponivel'
               CHECK (situacao IN ('disponivel','reservada','preparacao','vendida'))
);

-- ---------------------------------------------------------------------
-- FUNIL DE VENDAS  (RF-01)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS negociacao (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id      INTEGER NOT NULL REFERENCES cliente(id),
  moto_id         INTEGER REFERENCES moto(id),
  vendedor_id     INTEGER NOT NULL REFERENCES funcionario(id),
  etapa           TEXT    NOT NULL DEFAULT 'lead'
                  CHECK (etapa IN ('lead','contato','proposta','financiamento','fechada','perdida')),
  valor_negociado REAL    NOT NULL DEFAULT 0,
  motivo_perda    TEXT,
  criado_em       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  atualizado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- RF-01: "cada mudanca de etapa fica registrada com data e responsavel"
CREATE TABLE IF NOT EXISTS negociacao_historico (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  negociacao_id  INTEGER NOT NULL REFERENCES negociacao(id),
  etapa_de       TEXT,
  etapa_para     TEXT    NOT NULL,
  usuario_id     INTEGER REFERENCES usuario(id),
  responsavel    TEXT,
  momento        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- CONTRATOS E PARCELAS  (RF-04)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contrato (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero          TEXT    NOT NULL UNIQUE,   -- RNFR-04.2: unico e sequencial (CT-2026-0001)
  negociacao_id   INTEGER REFERENCES negociacao(id),
  cliente_id      INTEGER NOT NULL REFERENCES cliente(id),
  moto_id         INTEGER NOT NULL REFERENCES moto(id),
  vendedor_id     INTEGER NOT NULL REFERENCES funcionario(id),
  forma_pagamento TEXT    NOT NULL CHECK (forma_pagamento IN ('avista','financiado','entrada_parcelas')),
  valor_total     REAL    NOT NULL,
  valor_entrada   REAL    NOT NULL DEFAULT 0,
  qtd_parcelas    INTEGER NOT NULL DEFAULT 1,
  banco           TEXT,
  data_emissao    TEXT    NOT NULL DEFAULT (date('now','localtime')),
  situacao        TEXT    NOT NULL DEFAULT 'ativo'
                  CHECK (situacao IN ('ativo','quitado','cancelado')),
  cancelado_por   INTEGER REFERENCES usuario(id),   -- RNFR-04.3: somente o perfil Dono
  motivo_cancelamento TEXT
);

CREATE TABLE IF NOT EXISTS parcela (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  contrato_id    INTEGER NOT NULL REFERENCES contrato(id),
  numero         INTEGER NOT NULL,
  valor          REAL    NOT NULL,
  vencimento     TEXT    NOT NULL,
  data_pagamento TEXT,
  situacao       TEXT    NOT NULL DEFAULT 'aberta'
                 CHECK (situacao IN ('aberta','paga','cancelada')),
  UNIQUE (contrato_id, numero)
);

-- Regua de cobranca  (RF-05)
CREATE TABLE IF NOT EXISTS cobranca (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parcela_id   INTEGER NOT NULL REFERENCES parcela(id),
  tipo         TEXT    NOT NULL
               CHECK (tipo IN ('lembrete','segunda_via','contato','negativacao')),
  canal        TEXT,                      -- whatsapp | email | telefone
  observacao   TEXT,
  autorizado_por INTEGER REFERENCES usuario(id),  -- RNFR-05.2: negativacao exige o Dono
  momento      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------
-- SAC / POS-VENDA  (RF-02)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chamado (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero          TEXT    NOT NULL UNIQUE,   -- #1042
  cliente_id      INTEGER NOT NULL REFERENCES cliente(id),
  moto_id         INTEGER REFERENCES moto(id),
  assunto         TEXT    NOT NULL,
  descricao       TEXT,
  responsavel_id  INTEGER REFERENCES funcionario(id),
  data_abertura   TEXT    NOT NULL DEFAULT (date('now','localtime')),
  ultima_movimentacao TEXT NOT NULL DEFAULT (date('now','localtime')), -- RNFR-02.1
  data_conclusao  TEXT,
  situacao        TEXT    NOT NULL DEFAULT 'andamento'
                  CHECK (situacao IN ('andamento','resolvido'))
);

-- ---------------------------------------------------------------------
-- PARAMETROS DA LOJA  (RNFR-07.3, RNFR-03.2, RF-05)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parametro (
  chave      TEXT PRIMARY KEY,
  valor      TEXT NOT NULL,
  descricao  TEXT
);

-- ---------------------------------------------------------------------
-- INDICES  (RNFR-08.2: painel carregado em ate cinco segundos)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_cliente_vendedor    ON cliente (vendedor_id);
CREATE INDEX IF NOT EXISTS ix_moto_situacao       ON moto (situacao);
CREATE INDEX IF NOT EXISTS ix_negociacao_etapa    ON negociacao (etapa);
CREATE INDEX IF NOT EXISTS ix_negociacao_vendedor ON negociacao (vendedor_id);
CREATE INDEX IF NOT EXISTS ix_parcela_vencimento  ON parcela (vencimento, situacao);
CREATE INDEX IF NOT EXISTS ix_parcela_contrato    ON parcela (contrato_id);
CREATE INDEX IF NOT EXISTS ix_contrato_emissao    ON contrato (data_emissao);
CREATE INDEX IF NOT EXISTS ix_chamado_situacao    ON chamado (situacao);

-- =====================================================================
--  VISOES
--  Concentram as regras de calculo em SQL, para que servidor e telas
--  nunca recalculem a mesma coisa de formas diferentes (RNFR-08.1).
-- =====================================================================

-- Estoque com o tempo de patio recalculado a cada consulta (RNFR-03.1),
-- destacando as motos com mais de noventa dias (RNFR-03.2).
DROP VIEW IF EXISTS vw_estoque;
CREATE VIEW vw_estoque AS
SELECT
  m.*,
  CAST(julianday(COALESCE(m.data_saida, date('now','localtime'))) - julianday(m.data_entrada) AS INTEGER) AS dias_patio,
  CASE
    WHEN m.situacao <> 'vendida'
     AND julianday(date('now','localtime')) - julianday(m.data_entrada) > 90 THEN 1
    ELSE 0
  END AS parada_90_dias,
  (m.preco_venda - m.custo) AS margem
FROM moto m;

-- Parcelas com a situacao real de vencimento calculada na hora (RF-05).
DROP VIEW IF EXISTS vw_parcela;
CREATE VIEW vw_parcela AS
SELECT
  p.*,
  c.numero        AS contrato_numero,
  c.cliente_id,
  cl.nome         AS cliente_nome,
  cl.telefone     AS cliente_telefone,
  CASE
    WHEN p.situacao = 'paga'      THEN 'paga'
    WHEN p.situacao = 'cancelada' THEN 'cancelada'
    WHEN date(p.vencimento) < date('now','localtime') THEN 'vencida'
    ELSE 'aberta'
  END AS situacao_real,
  CAST(julianday(date('now','localtime')) - julianday(p.vencimento) AS INTEGER) AS dias_atraso
FROM parcela p
JOIN contrato c ON c.id = p.contrato_id
JOIN cliente  cl ON cl.id = c.cliente_id
WHERE c.situacao <> 'cancelado';

-- Chamados de pos-venda, marcando como atrasado o que passou de cinco
-- dias sem movimentacao (RNFR-02.1).
DROP VIEW IF EXISTS vw_chamado;
CREATE VIEW vw_chamado AS
SELECT
  ch.*,
  cl.nome AS cliente_nome,
  f.nome  AS responsavel_nome,
  m.codigo AS moto_codigo,
  m.modelo AS moto_modelo,
  CASE
    WHEN ch.situacao = 'resolvido' THEN 'resolvido'
    WHEN julianday(date('now','localtime')) - julianday(ch.ultima_movimentacao) > 5 THEN 'atrasado'
    ELSE 'andamento'
  END AS situacao_real
FROM chamado ch
JOIN cliente cl      ON cl.id = ch.cliente_id
LEFT JOIN funcionario f ON f.id = ch.responsavel_id
LEFT JOIN moto m     ON m.id = ch.moto_id;

-- Comissao do vendedor (RF-07). Conta apenas contratos ativos cuja
-- primeira parcela ja foi quitada (RNFR-07.1).
DROP VIEW IF EXISTS vw_comissao;
CREATE VIEW vw_comissao AS
SELECT
  c.vendedor_id,
  f.nome                          AS vendedor_nome,
  f.percentual_comissao,
  strftime('%Y-%m', c.data_emissao) AS competencia,
  COUNT(*)                        AS vendas,
  SUM(c.valor_total)              AS faturamento,
  ROUND(SUM(c.valor_total) * f.percentual_comissao / 100.0, 2) AS comissao
FROM contrato c
JOIN funcionario f ON f.id = c.vendedor_id
WHERE c.situacao <> 'cancelado'
  AND EXISTS (
        SELECT 1 FROM parcela p
        WHERE p.contrato_id = c.id AND p.numero = 1 AND p.situacao = 'paga'
      )
GROUP BY c.vendedor_id, competencia;
