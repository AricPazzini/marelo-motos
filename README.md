# Marelo Motos — Sistema de Gestão

Protótipo funcional do sistema de gestão da **Marelo Motos**, revenda de
motocicletas de Itapetininga — SP.

**Projeto Integrador em ADS II — FATEC**
Aric Proença Pazzini · Lucas Belfort Darantes Medeiros

---

## 🔗 Abrir o sistema agora, sem instalar nada

**<https://aricpazzini.github.io/marelo-motos/>**

Entre com `marcelo@marelomotos.com.br` e a senha `marelo123` (ou clique em um
dos atalhos da tela de login).

Essa é a **versão de demonstração**: o sistema roda inteiro dentro do
navegador, com um banco **SQLite de verdade** (compilado para WebAssembly)
montado na hora a partir dos mesmos `schema.sql` e `seed.sql` do projeto.
Pode cadastrar, fechar vendas e mexer à vontade — ao recarregar, tudo volta
ao estado inicial, e nada é enviado para lugar nenhum.

> **Diferença importante para a apresentação:** nessa versão as permissões
> são conferidas *no navegador*, então elas demonstram o comportamento mas
> não são uma barreira de segurança real. No sistema completo (a pasta
> `servidor/`, que roda no seu computador), quem barra é o servidor — fora
> do alcance do usuário. As duas versões usam **exatamente o mesmo**
> `api.js`, `auth.js` e `regras.js`.

---

## O que é este protótipo

Não é uma maquete de telas: é um sistema que **funciona de verdade**, com
banco de dados, login, permissões por perfil e as regras de negócio
implementadas. Ele foi feito para ser usado nas fases de teste e validação
com o cliente.

O que já está implementado, ponta a ponta:

| Requisito | O que o sistema faz |
|---|---|
| **RF-01** | Cadastro de clientes e funil de vendas em cinco etapas, com histórico de cada mudança |
| **RF-02** | Chamados de pós-venda (SAC), com marcação automática de atraso |
| **RF-03** | Estoque de motocicletas, com tempo de pátio recalculado a cada consulta |
| **RF-04** | Fechamento da venda: gera contrato numerado, cria as parcelas e dá baixa no estoque |
| **RF-05** | Controle de inadimplência e régua de cobrança configurável |
| **RF-06** | Cadastro de funcionários, férias e desligamento com histórico preservado |
| **RF-07** | Cálculo automático da comissão dos vendedores |
| **RF-08** | Painel gerencial do proprietário, alimentado pelos demais módulos |

A rastreabilidade completa (cada requisito e onde ele está no código) está
em [docs/RASTREABILIDADE.md](docs/RASTREABILIDADE.md).

---

## Como rodar

### O que precisa estar instalado

Apenas o **Node.js versão 22 ou mais nova** — baixe em <https://nodejs.org>.
O sistema não usa nenhuma biblioteca externa: nada de `npm install`.

### Passo a passo

1. Baixe ou clone esta pasta para o computador.
2. Dê **dois cliques em `INICIAR.bat`**.
3. O navegador abre sozinho em <http://localhost:7820>.
4. Para encerrar, feche a janela preta do servidor.

Na primeira vez, o banco de dados é criado automaticamente e já vem com
dados de teste.

### Usuários de teste

Todos usam a senha **`marelo123`**.

| E-mail | Perfil | O que enxerga |
|---|---|---|
| `marcelo@marelomotos.com.br` | Proprietário | Tudo: painel gerencial, financeiro, RH, estoque |
| `rodrigo@marelomotos.com.br` | Vendedor | Só a própria carteira de clientes; sem folha nem painel |
| `patricia@marelomotos.com.br` | Vendedora | Idem, com a carteira dela |
| `wesley@marelomotos.com.br` | Vendedor | Idem |
| `claudia@marelomotos.com.br` | Financeiro | Contratos, boletos e cobrança |

> Entrar com perfis diferentes é a melhor forma de mostrar o controle de
> acesso: o menu muda, e as operações bloqueadas são recusadas **pelo
> servidor**, não apenas escondidas na tela.

### Voltar ao estado inicial

Dê dois cliques em **`RECRIAR-BANCO.bat`** (com o sistema fechado). O banco
anterior é guardado em `banco/anteriores`, então nada é perdido.

---

## Tecnologias

Conforme exigido pela disciplina:

- **HTML** — as telas (`publico/index.html`, `publico/app.html`)
- **CSS** — folha de estilo única (`publico/css/estilo.css`)
- **JavaScript** — nas telas (`publico/js/`) e no servidor (`servidor/`)
- **Banco SQL** — SQLite, com estrutura em `banco/schema.sql` e carga em
  `banco/seed.sql`

O servidor usa o módulo `node:sqlite`, nativo do Node. A escolha por não
usar bibliotecas externas evita que o projeto quebre por dependência
desatualizada durante o semestre.

---

## Organização das pastas

```
marelo-motos/
├─ INICIAR.bat              inicia o sistema
├─ RECRIAR-BANCO.bat        volta o banco ao estado inicial
│
├─ banco/
│  ├─ schema.sql            estrutura: tabelas, índices e visões
│  ├─ seed.sql              dados de teste (fictícios)
│  └─ marelo.db             o banco em si (gerado, não versionado)
│
├─ servidor/
│  ├─ servidor.js           servidor HTTP e roteamento
│  ├─ banco.js              acesso ao SQLite e senhas
│  ├─ auth.js               login, sessão e matriz de permissões
│  ├─ regras.js             regras de negócio (CPF, venda, cobrança)
│  └─ api.js                as rotas da API
│
├─ publico/                 tudo que roda no navegador
│  ├─ index.html            tela de login
│  ├─ app.html              o sistema
│  ├─ css/estilo.css
│  └─ js/
│     ├─ nucleo.js          funções comuns às telas
│     ├─ app.js             menu e navegação
│     └─ telas/             uma tela por módulo
│
├─ ferramentas/
│  ├─ gerar-site.js         monta a versão do GitHub Pages
│  ├─ publicar-site.js      envia essa versão para o GitHub
│  ├─ recriar-banco.js      volta o banco ao estado inicial
│  └─ web/                  adaptadores que fazem o servidor rodar
│                           dentro do navegador (SQLite WebAssembly)
├─ testes/                  testes automatizados
└─ docs/                    documentação técnica
```

---

## Publicar

| Onde | Como | Para quê |
|---|---|---|
| **GitHub Pages** | `PUBLICAR-SITE.bat` | Demonstração pública, sem servidor. Já no ar. |
| **Railway** | `railway.json` pronto; conectar o repositório | Sistema completo, com servidor e banco em arquivo que **persiste** |
| **Vercel** | `vercel.json` pronto; importar o repositório | Publica a mesma demonstração do Pages (a Vercel roda o `gerar-site.js` no build) |

> A Vercel **não** serve para o sistema completo: o disco dela é temporário,
> e o arquivo do banco seria apagado a cada atualização. Para o sistema com
> servidor, o caminho é o Railway (disco permanente) ou trocar o SQLite por
> um banco de nuvem.

---

## Sobre os dados

**Todos os dados deste protótipo são fictícios.** Os nomes, valores,
quantidades e regras foram criados por nós para dar substância às telas, e
precisam ser confirmados na visita à loja.

As perguntas que precisam ser feitas ao cliente estão no documento
*"PERGUNTAS PARA A VISITA — MARELO MOTOS"*, entregue em Engenharia de
Software II. Um ponto novo, surgido durante a construção do protótipo,
entra nessa lista:

> **A comissão é liberada quando?** Assumimos que o cliente quita a entrada
> e a primeira parcela no ato da entrega, e que é isso que libera a comissão
> do vendedor (RNFR-07.1). Se na prática a comissão sair na assinatura do
> contrato, a regra muda.

---

## O que ainda não faz parte do escopo

Conforme definido na Documentação de Sistema:

- Emissão de nota fiscal eletrônica
- Integração com o Detran (emplacamento e transferência)
- Aplicativo para o cliente final acompanhar as próprias parcelas
- Integração com o banco emissor dos boletos (os boletos são gerados como
  registro interno, sem arquivo de remessa bancária)
