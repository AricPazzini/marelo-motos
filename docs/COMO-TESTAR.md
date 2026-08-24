# Roteiro de testes

Roteiro para a fase de testes e validação. Cada caso tem o que fazer e o
que deve acontecer. Marque o que passou e anote o que saiu diferente.

> Antes de começar, rode o **`RECRIAR-BANCO.bat`** para partir sempre do
> mesmo estado. Depois abra o **`INICIAR.bat`**.

---

## 1. Acesso e permissões

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 1.1 | Entrar com um e-mail que não existe | Mensagem "E-mail ou senha inválidos" | ⬜ |
| 1.2 | Entrar com `marcelo@marelomotos.com.br` e senha errada | Mesma mensagem, sem dizer qual campo errou | ⬜ |
| 1.3 | Entrar como **Marcelo** (Dono) | Menu com 6 módulos, incluindo Área do Dono e Configurações | ⬜ |
| 1.4 | Sair e entrar como **Rodrigo** (Vendedor) | Menu com só 3 módulos: Meu Painel, Comercial, Estoque | ⬜ |
| 1.5 | Como Rodrigo, digitar na barra de endereço `/app.html#financeiro` | O sistema não abre o Financeiro; cai no Meu Painel | ⬜ |
| 1.6 | Entrar como **Cláudia** (Financeiro) | Vê Financeiro, mas não vê RH nem Área do Dono | ⬜ |

---

## 2. Clientes e funil (RF-01)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 2.1 | Como Rodrigo, abrir Comercial → Clientes | Aparecem só os clientes dele (5), não os 15 da loja | ⬜ |
| 2.2 | Como Marcelo, abrir a mesma tela | Aparecem os 15 clientes | ⬜ |
| 2.3 | Cadastrar cliente com CPF `111.111.111-11` | Recusa: "CPF inválido" | ⬜ |
| 2.4 | Cadastrar cliente com CPF `123.456.789-00` | Recusa: o dígito verificador não fecha | ⬜ |
| 2.5 | Cadastrar com um CPF válido, mas sem telefone | Recusa: "Informe um telefone com DDD" | ⬜ |
| 2.6 | Cadastrar com CPF de um cliente que já existe | Recusa: "Já existe um cliente com este CPF" | ⬜ |
| 2.7 | Cadastrar corretamente | Cliente aparece na lista, na carteira de quem cadastrou | ⬜ |
| 2.8 | Abrir uma negociação do funil | Janela com dados da moto e o histórico de etapas | ⬜ |
| 2.9 | Clicar em "Avançar para..." | O cartão muda de coluna e o histórico ganha uma linha com seu nome e a data | ⬜ |
| 2.10 | Marcar uma negociação como perdida | Sai do funil; pede o motivo | ⬜ |

---

## 3. Fechamento da venda (RF-04) — o teste mais importante

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 3.1 | Abrir uma negociação e clicar em "Fechar a venda" | Janela com a simulação das parcelas | ⬜ |
| 3.2 | Mudar a quantidade de parcelas | O valor da parcela recalcula na hora | ⬜ |
| 3.3 | Pôr uma entrada maior que o valor da venda | Aviso vermelho; o sistema recusa se insistir | ⬜ |
| 3.4 | Confirmar uma venda financiada em 12x | Mensagem com o número do contrato (CT-2026-0015 ou seguinte) | ⬜ |
| 3.5 | Voltar ao funil | A negociação saiu das colunas e apareceu em "Venda fechada" | ⬜ |
| 3.6 | Ir em Estoque e procurar a moto vendida | Está como **Vendida**, com data de saída de hoje | ⬜ |
| 3.7 | Ir em Financeiro → Contratos e abrir o contrato novo | As 12 parcelas estão lá, com vencimentos mensais | ⬜ |
| 3.8 | Somar as parcelas | O total bate exatamente com (valor − entrada) | ⬜ |
| 3.9 | Tentar fechar a mesma negociação de novo | Recusa: "Esta negociação já foi fechada" | ⬜ |
| 3.10 | Fechar uma venda **à vista** | A parcela já nasce paga e o contrato fica "Quitado" | ⬜ |

---

## 4. Estoque (RF-03)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 4.1 | Abrir Estoque como Marcelo | Botão "+ Entrada de veículo" disponível | ⬜ |
| 4.2 | Abrir Estoque como Rodrigo | Sem botão; aviso de que o perfil só consulta | ⬜ |
| 4.3 | Olhar as motos com mais de 90 dias | Linha destacada, número de dias em vermelho e aviso no topo | ⬜ |
| 4.4 | Cadastrar moto com preço de venda menor que o custo | Recusa e explica | ⬜ |
| 4.5 | Cadastrar moto com um código que já existe | Recusa: código repetido | ⬜ |
| 4.6 | Cadastrar uma moto com data de entrada de 4 meses atrás | Ela entra já marcada como parada há mais de 90 dias | ⬜ |

---

## 5. Financeiro (RF-05)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 5.1 | Abrir Financeiro → Resumo | Inadimplência com 4 clientes em atraso | ⬜ |
| 5.2 | Abrir a aba Cobrança | Só aparecem parcelas vencidas ou perto de vencer — não as 300 futuras | ⬜ |
| 5.3 | Olhar a coluna "Ação prevista" | Quanto maior o atraso, mais severa a ação | ⬜ |
| 5.4 | Como **Cláudia**, tentar registrar uma negativação | Aparece "requer o dono" no lugar do botão | ⬜ |
| 5.5 | Como **Marcelo**, registrar a negativação | Pede confirmação e avisa que fica registrado no seu nome | ⬜ |
| 5.6 | Abrir um contrato e dar baixa numa parcela | A parcela vira "Paga" com a data de hoje | ⬜ |
| 5.7 | Dar baixa na última parcela em aberto de um contrato | O contrato inteiro vira "Quitado" | ⬜ |
| 5.8 | Como Cláudia, tentar cancelar um contrato | Não há botão de cancelar | ⬜ |
| 5.9 | Como Marcelo, cancelar um contrato | Pede o motivo; a moto volta ao pátio como disponível | ⬜ |

---

## 6. RH e comissão (RF-06 e RF-07)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 6.1 | Como Marcelo, abrir RH → Equipe | Colunas de salário e comissão aparecem | ⬜ |
| 6.2 | Abrir a aba "Folha e comissões" | Total da folha, com a comissão somada a cada vendedor | ⬜ |
| 6.3 | Conferir a comissão de um vendedor | É o percentual dele aplicado ao faturamento do mês | ⬜ |
| 6.4 | Como Rodrigo, abrir Meu Painel | Vê a própria comissão, e nenhuma de outro vendedor | ⬜ |
| 6.5 | Desligar um funcionário | Sai da folha, mas continua na lista como "Desligado" | ⬜ |
| 6.6 | Tentar entrar com o login do funcionário desligado | O acesso é recusado | ⬜ |
| 6.7 | Abrir RH → Férias | As férias dos próximos 30 dias aparecem em destaque | ⬜ |

---

## 7. Painel do proprietário (RF-08)

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 7.1 | Anotar o faturamento do mês | — | ⬜ |
| 7.2 | Fechar uma venda nova no Comercial | — | ⬜ |
| 7.3 | Voltar ao painel | O faturamento e o número de vendas subiram sozinhos | ⬜ |
| 7.4 | Conferir os alertas do dia | Batem com o que os outros módulos mostram | ⬜ |

---

## 8. Aparência e uso

| # | O que fazer | O que deve acontecer | OK? |
|---|---|---|---|
| 8.1 | Reduzir a janela do navegador até a largura de um celular | O menu vira barra horizontal; as tabelas rolam de lado | ⬜ |
| 8.2 | Navegar só com a tecla Tab | Dá para chegar a todos os botões, com contorno visível | ⬜ |
| 8.3 | Abrir uma janela e apertar Esc | A janela fecha | ⬜ |

---

## 9. Testes automatizados

Abra o Prompt de Comando na pasta do projeto e rode:

```bash
npm run testar
```

Devem passar **31 testes**, cobrindo CPF, senhas, permissões, fechamento de
venda, tempo de pátio, régua de cobrança, comissão e SAC.

---

## Onde anotar os problemas

| Data | Caso | O que aconteceu | Quem viu |
|---|---|---|---|
|  |  |  |  |
