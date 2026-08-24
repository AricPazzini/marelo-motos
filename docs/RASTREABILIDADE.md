# Rastreabilidade dos requisitos

Este documento liga cada requisito da **Documentação de Sistema** ao ponto
exato do código que o implementa, e ao teste que prova que ele funciona.

Serve para a defesa do projeto: qualquer requisito pode ser demonstrado
abrindo o arquivo indicado.

---

## Requisitos funcionais

### RF-01 — Gerenciar o funil de vendas e o cadastro de clientes

| Onde | Arquivo |
|---|---|
| Tabelas | `banco/schema.sql` → `cliente`, `negociacao`, `negociacao_historico` |
| Regras | `servidor/api.js` → rotas `/api/clientes`, `/api/funil`, `/api/negociacoes` |
| Tela | `publico/js/telas/comercial.js` |
| Teste | *"a mudanca de etapa fica registrada com o responsavel"* |

Cada mudança de etapa grava uma linha em `negociacao_historico` com a data
e o nome de quem moveu — visível ao abrir qualquer negociação no funil.

| RNF | Como foi atendido |
|---|---|
| **RNFR-01.1** — vendedor vê só a própria carteira | Função `filtroCarteira()` em `api.js` acrescenta `AND vendedor_id = ?` a todas as consultas do perfil comercial. O filtro é aplicado no **servidor**: mesmo alterando a tela, o vendedor não recebe dados de outro. |
| **RNFR-01.2** — CPF válido e um telefone | `cpfValido()` em `regras.js` confere os dois dígitos verificadores. 5 testes automatizados. |
| **RNFR-01.3** — etapas lado a lado, em até 2 cliques | O funil é a tela inicial do módulo Comercial: 1 clique no menu. As 5 etapas aparecem em colunas paralelas (`.funil` no CSS). |

---

### RF-02 — Registrar e acompanhar os chamados de pós-venda (SAC)

| Onde | Arquivo |
|---|---|
| Tabela | `banco/schema.sql` → `chamado` |
| Cálculo | `banco/schema.sql` → visão `vw_chamado` |
| Tela | `publico/js/telas/comercial.js` → `montarSac()` |

| RNF | Como foi atendido |
|---|---|
| **RNFR-02.1** — 5 dias sem movimentação = atrasado | Calculado na visão `vw_chamado`, na hora da consulta. Não existe um "campo atrasado" que possa ficar desatualizado. |
| **RNFR-02.2** — histórico preservado após a conclusão | O chamado resolvido continua na tabela, com `data_conclusao` preenchida. Nada é apagado. |
| **RNFR-02.3** — abertura em uma única tela | A janela "Abrir chamado" tem todos os campos e um só botão. |

---

### RF-03 — Controlar o estoque de motocicletas

| Onde | Arquivo |
|---|---|
| Tabela | `banco/schema.sql` → `moto` |
| Cálculo | `banco/schema.sql` → visão `vw_estoque` |
| Tela | `publico/js/telas/estoque.js` |

| RNF | Como foi atendido |
|---|---|
| **RNFR-03.1** — tempo de pátio recalculado sozinho | `vw_estoque` calcula `dias_patio` por diferença de datas a cada consulta. Nenhuma rotina precisa rodar. |
| **RNFR-03.2** — destaque acima de 90 dias | Coluna `parada_90_dias` na visão; a tela pinta a linha e mostra um aviso no topo. |
| **RNFR-03.3** — funcionário só consulta | Permissão `estoque.escrever` liberada apenas ao Dono (`auth.js`). Testado. |

---

### RF-04 — Gerar contratos e boletos das vendas

| Onde | Arquivo |
|---|---|
| Tabelas | `banco/schema.sql` → `contrato`, `parcela` |
| Regra | `servidor/regras.js` → `fecharVenda()` |
| Tela | `publico/js/telas/comercial.js` → `abrirFechamento()` |

O fechamento acontece dentro de uma **transação**: gera o contrato, cria as
parcelas, dá baixa da moto no estoque e move a negociação. Se qualquer
passo falhar, nada é gravado — há um teste que confirma isso.

| RNF | Como foi atendido |
|---|---|
| **RNFR-04.1** — contrato gerado do modelo, sem redigitação | Os dados vêm do cliente e da moto já cadastrados; o operador só escolhe a condição de pagamento. |
| **RNFR-04.2** — número único e sequencial | `proximoNumeroContrato()` + restrição `UNIQUE` na coluna `numero`. Testado. |
| **RNFR-04.3** — só o Dono cancela | Permissão `contrato.cancelar`. Testado. |

---

### RF-05 — Controlar a inadimplência e a cobrança

| Onde | Arquivo |
|---|---|
| Tabelas | `banco/schema.sql` → `parcela`, `cobranca` |
| Cálculo | visão `vw_parcela` + `reguaDeCobranca()` em `regras.js` |
| Tela | `publico/js/telas/financeiro.js` → `montarCobranca()` |

A situação "vencida" nunca é gravada: é deduzida na consulta comparando o
vencimento com a data de hoje. Assim uma parcela nunca fica marcada como
"em aberto" depois de vencer.

| RNF | Como foi atendido |
|---|---|
| **RNFR-05.1** — envio conforme a régua configurada | Os quatro prazos ficam na tabela `parametro` e podem ser mudados em Configurações, sem alterar o programa. |
| **RNFR-05.2** — negativação exige o proprietário | Bloqueada em dois pontos: na permissão `negativacao` e dentro da própria rota, que grava `autorizado_por`. Testado. |
| **RNFR-05.3** — LGPD | Ver a seção de requisitos sistêmicos, abaixo. |

---

### RF-06 — Gerenciar os funcionários da loja

| Onde | Arquivo |
|---|---|
| Tabelas | `banco/schema.sql` → `funcionario`, `ferias` |
| Tela | `publico/js/telas/rh.js` |

| RNF | Como foi atendido |
|---|---|
| **RNFR-06.1** — folha só para o Dono | O salário **não sai do servidor** para quem não é Dono: a rota remove os campos antes de responder (`api.js`, rota `/api/rh/funcionarios`). Esconder só na tela não seria suficiente. |
| **RNFR-06.2** — aviso 30 dias antes das férias | Consulta na rota `/api/painel` e na aba Férias. |
| **RNFR-06.3** — histórico preservado no desligamento | O desligamento grava `data_desligamento` e desativa o login; a linha nunca é excluída. |

---

### RF-07 — Calcular a comissão dos vendedores

| Onde | Arquivo |
|---|---|
| Cálculo | `banco/schema.sql` → visão `vw_comissao` |
| Telas | `rh.js` (folha) e `meu-painel.js` (o próprio vendedor) |

| RNF | Como foi atendido |
|---|---|
| **RNFR-07.1** — só venda com 1ª parcela quitada | Cláusula `EXISTS` dentro de `vw_comissao`. Testado. |
| **RNFR-07.2** — vendedor vê só a própria | A rota `/api/rh/comissoes` filtra por `funcionario_id` quando o usuário não é Dono. |
| **RNFR-07.3** — percentual parametrizável | Coluna `percentual_comissao` por funcionário, editável em RH. |

---

### RF-08 — Apresentar o painel gerencial do proprietário

| Onde | Arquivo |
|---|---|
| Consultas | `servidor/api.js` → rota `/api/painel` |
| Tela | `publico/js/telas/painel.js` |

| RNF | Como foi atendido |
|---|---|
| **RNFR-08.1** — sem digitação manual | Todo indicador vem de `SELECT` sobre os módulos. Não existe nenhum número fixo na tela. |
| **RNFR-08.2** — carrega em até 5 segundos | Uma única chamada à API; índices criados em `schema.sql` sobre as colunas usadas nos filtros. |
| **RNFR-08.3** — exclusivo do Dono | Permissão `painel.gerencial`. Testado. |

---

## Requisitos não funcionais sistêmicos

| Requisito | Como foi atendido |
|---|---|
| **RNFS-01** — login e senha individuais, com perfil | Tabela `usuario`, senha com scrypt, sessão por token. Toda tentativa fica em `log_acesso`. |
| **RNFS-02** — mesmo padrão visual e de nomenclatura | Uma só folha de estilo (`estilo.css`) e um só conjunto de componentes (`nucleo.js`) para todas as telas. |
| **RNFS-03** — computador e celular | Layout responsivo; abaixo de 860px o menu vira barra horizontal e as tabelas rolam. |
| **RNFS-04** — tráfego criptografado | **Pendente para a produção.** Em desenvolvimento o sistema roda em `http://localhost`. Ao publicar (Railway ou outro), o HTTPS é fornecido pelo servidor. O cookie de sessão já usa `HttpOnly` e `SameSite=Strict`. |
| **RNFS-05** — LGPD | Os dados pessoais ficam só no banco da loja; nada é enviado para fora. O acesso é restrito por perfil e as tentativas de login são registradas. **Falta definir com o cliente** o prazo de retenção e o procedimento de exclusão a pedido do titular. |
| **RNFS-06** — cópia de segurança diária | Função `gerarBackup()` e botão em Configurações. **Pendente:** o agendamento automático diário, que será configurado no servidor de produção. |
| **RNFS.07** — acessibilidade | Contraste das cores revisado (texto sobre o amarelo escurecido para leitura), foco visível para navegação por teclado, `aria-label` nas janelas, tabelas com cabeçalho real. |

---

## O que ainda não está pronto

Registrado aqui de propósito, para não passar por concluído:

1. **HTTPS (RNFS-04)** — depende de publicar em um servidor.
2. **Backup automático diário (RNFS-06)** — o botão manual funciona; falta o agendamento.
3. **Cadastro de usuários pela tela** — hoje o vínculo entre funcionário e
   login é feito direto no banco. A tela de RH admite o funcionário, mas o
   e-mail e a senha de acesso ainda não têm formulário.
4. **Boleto bancário de verdade** — o sistema gera a parcela como registro
   interno. A emissão do boleto pelo banco depende da resposta da pergunta
   23 do roteiro de visita.
