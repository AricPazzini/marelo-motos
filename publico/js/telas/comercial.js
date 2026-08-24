// =====================================================================
//  Modulo Comercial
//  RF-01 — funil de vendas e cadastro de clientes
//  RF-02 — chamados de pos-venda (SAC)
//  RF-04 — fechamento da venda, que gera o contrato e os boletos
// =====================================================================

import {
  api, dinheiro, numero, tabela, etiqueta, rotulo, escapar, data,
  janela, lerCampos, recado, confirmar, mostrarErroNaJanela,
} from '../nucleo.js';
import { recarregar } from '../app.js';

export function abas(contexto) {
  const lista = [
    { id: 'funil', nome: 'Funil de vendas' },
    { id: 'clientes', nome: 'Clientes' },
  ];
  if (contexto.permissoes['sac.ler']) lista.push({ id: 'sac', nome: 'SAC — pós-venda' });
  return lista;
}

export async function montar(area, contexto, aba) {
  if (aba === 'clientes') return montarClientes(area, contexto);
  if (aba === 'sac') return montarSac(area, contexto);
  return montarFunil(area, contexto);
}

// =====================================================================
//  RF-01 — FUNIL DE VENDAS
// =====================================================================
const ETAPAS_SEGUINTES = {
  lead: 'contato',
  contato: 'proposta',
  proposta: 'financiamento',
  financiamento: null, // daqui so sai fechando a venda
};

async function montarFunil(area, contexto) {
  const { colunas } = await api.ler('/api/funil');
  const podeEditar = contexto.permissoes['comercial.escrever'];

  const colunasHtml = colunas.map((coluna) => {
    const itens = coluna.itens.map((item) => {
      const detalhe = coluna.etapa === 'fechada'
        ? `${escapar(item.numero)} · ${escapar(item.marca || '')} ${escapar(item.modelo || '')}`
        : `${escapar(item.marca || '')} ${escapar(item.modelo || 'moto a definir')} · ${escapar(item.vendedor_nome)}`;

      return `
        <button class="lead" data-negociacao="${item.id}" data-etapa="${escapar(coluna.etapa)}">
          <div class="nm">${escapar(item.cliente_nome)}</div>
          <div class="mt2">${detalhe}</div>
          <div class="vl">${dinheiro(item.valor_negociado)}</div>
        </button>`;
    }).join('');

    return `
      <div class="coluna">
        <h4>${escapar(rotulo(coluna.etapa))}</h4>
        <div class="qtd">${coluna.quantidade} · ${dinheiro(coluna.valor)}</div>
        ${itens || '<p style="font-size:11.5px;color:var(--texto-fraco);padding:8px 0">Nenhuma negociação.</p>'}
      </div>`;
  }).join('');

  area.innerHTML = `
    <h1 class="titulo">Comercial — funil de vendas</h1>
    <p class="subtitulo">
      Acompanhamento do cliente do primeiro contato até a entrega da moto.
      ${contexto.usuario.perfil === 'dono'
        ? 'Você enxerga a carteira de todos os vendedores.'
        : 'Você enxerga somente os clientes da sua carteira.'}
    </p>

    <div class="barra-acoes">
      ${podeEditar ? '<button class="btn" id="nova-negociacao">+ Nova negociação</button>' : ''}
      ${podeEditar ? '<button class="btn linha" id="novo-cliente">+ Novo cliente</button>' : ''}
      <span class="espaco"></span>
      <span style="font-size:12px;color:var(--texto-fraco)">
        Clique em uma negociação para ver o histórico e avançar de etapa.
      </span>
    </div>

    <div class="funil">${colunasHtml}</div>`;

  document.getElementById('nova-negociacao')?.addEventListener('click', () => abrirNovaNegociacao());
  document.getElementById('novo-cliente')?.addEventListener('click', () => abrirNovoCliente());

  for (const cartao of area.querySelectorAll('.lead')) {
    cartao.addEventListener('click', () => {
      if (cartao.dataset.etapa === 'fechada') {
        recado('Esta venda já foi fechada. O contrato está no módulo Financeiro.');
        return;
      }
      abrirNegociacao(cartao.dataset.negociacao, podeEditar);
    });
  }
}

// Detalhe da negociacao, com o historico exigido pelo RF-01
async function abrirNegociacao(id, podeEditar) {
  const n = await api.ler(`/api/negociacoes/${id}`);
  const proxima = ETAPAS_SEGUINTES[n.etapa];

  const historico = n.historico.map((h) => `
    <li>
      <span>${escapar(h.etapa_de ? rotulo(h.etapa_de) : 'Início')} → <b>${escapar(rotulo(h.etapa_para))}</b></span>
      <span style="font-size:11.5px;color:var(--texto-fraco)">
        ${data(h.momento)} · ${escapar(h.responsavel || '—')}
      </span>
    </li>`).join('');

  const acoes = [];
  if (podeEditar) {
    if (proxima) {
      acoes.push({
        texto: `Avançar para "${rotulo(proxima)}"`,
        aoClicar: async () => {
          await api.alterar(`/api/negociacoes/${id}/etapa`, { etapa: proxima });
          recado(`Negociação movida para ${rotulo(proxima)}.`);
          recarregar();
        },
      });
    }
    acoes.push({
      texto: 'Fechar a venda',
      aoClicar: ({ fechar }) => { fechar(); abrirFechamento(n); return 'manter'; },
    });
    acoes.push({
      texto: 'Marcar como perdida',
      estilo: 'perigo',
      aoClicar: async ({ fechar }) => {
        fechar();
        const motivo = await perguntarMotivo();
        if (motivo === null) return 'manter';
        await api.alterar(`/api/negociacoes/${id}/etapa`, { etapa: 'perdida', motivo });
        recado('Negociação marcada como perdida.');
        recarregar();
        return 'manter';
      },
    });
  }
  acoes.push({ texto: 'Fechar', estilo: 'linha' });

  janela({
    titulo: n.cliente_nome,
    descricao: `${n.telefone || 'sem telefone'} · CPF ${n.cpf} · vendedor: ${n.vendedor_nome}`,
    largo: true,
    corpo: `
      <div class="grade g2">
        <div>
          <h3 style="font-size:12px;color:var(--texto-fraco);text-transform:uppercase;margin-bottom:12px">Negociação</h3>
          <ul class="lista-simples">
            <li><span>Etapa atual</span>${etiqueta(n.etapa)}</li>
            <li><span>Moto de interesse</span><b>${escapar(n.moto_codigo || '—')} ${escapar(n.modelo || '')}</b></li>
            <li><span>Ano / cor</span><b>${escapar(n.ano || '—')} · ${escapar(n.cor || '—')}</b></li>
            <li><span>Preço de tabela</span><b>${dinheiro(n.preco_venda)}</b></li>
            <li><span>Valor negociado</span><b>${dinheiro(n.valor_negociado)}</b></li>
          </ul>
        </div>
        <div>
          <h3 style="font-size:12px;color:var(--texto-fraco);text-transform:uppercase;margin-bottom:12px">
            Histórico do funil
          </h3>
          <ul class="lista-simples">${historico}</ul>
        </div>
      </div>`,
    acoes,
  });
}

function perguntarMotivo() {
  return new Promise((resolve) => {
    janela({
      titulo: 'Por que a negociação foi perdida?',
      corpo: `
        <div class="campo">
          <label for="motivo">Motivo</label>
          <select name="motivo" id="motivo">
            <option>Cliente fechou com a concorrência</option>
            <option>Crédito não aprovado</option>
            <option>Desistiu da compra</option>
            <option>Não encontramos a moto procurada</option>
            <option>Sem retorno do cliente</option>
          </select>
        </div>`,
      acoes: [
        { texto: 'Cancelar', estilo: 'linha', aoClicar: () => resolve(null) },
        { texto: 'Confirmar', estilo: 'perigo', aoClicar: ({ fundo }) => resolve(lerCampos(fundo).motivo) },
      ],
    });
  });
}

// ---------------------------------------------------------------------
// RF-04 — fechamento da venda
// ---------------------------------------------------------------------
function abrirFechamento(n) {
  const { fundo } = janela({
    titulo: 'Fechar a venda',
    descricao: `${n.cliente_nome} · ${n.moto_codigo || ''} ${n.modelo || ''}`,
    corpo: `
      <div class="aviso info">
        Ao confirmar, o sistema gera o contrato com número sequencial, cria as
        parcelas da condição escolhida e dá baixa da moto no estoque — tudo de
        uma vez só.
      </div>

      <div class="campo">
        <label for="formaPagamento">Forma de pagamento</label>
        <select name="formaPagamento" id="formaPagamento">
          <option value="avista">À vista</option>
          <option value="financiado" selected>Financiado pelo banco</option>
          <option value="entrada_parcelas">Entrada + parcelas na loja</option>
        </select>
      </div>

      <div class="linha-campos">
        <div class="campo">
          <label for="valorTotal">Valor total da venda</label>
          <input type="number" step="0.01" name="valorTotal" id="valorTotal" value="${n.valor_negociado}">
        </div>
        <div class="campo">
          <label for="valorEntrada">Entrada</label>
          <input type="number" step="0.01" name="valorEntrada" id="valorEntrada" value="0">
        </div>
      </div>

      <div class="linha-campos" id="bloco-parcelas">
        <div class="campo">
          <label for="qtdParcelas">Quantidade de parcelas</label>
          <select name="qtdParcelas" id="qtdParcelas">
            ${[6, 12, 18, 24, 36, 48].map((q) => `<option value="${q}"${q === 24 ? ' selected' : ''}>${q}x</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label for="banco">Banco</label>
          <select name="banco" id="banco">
            <option value="">— não se aplica —</option>
            <option>Banco Pan</option>
            <option>Santander</option>
            <option>Itaú</option>
            <option>Bradesco</option>
          </select>
        </div>
      </div>

      <div class="aviso" id="previa">Escolha a condição para ver a simulação.</div>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Confirmar e gerar contrato',
        aoClicar: async ({ fundo: f }) => {
          const dados = lerCampos(f);
          const resultado = await api.criar(`/api/negociacoes/${n.id}/fechar`, {
            formaPagamento: dados.formaPagamento,
            valorTotal: Number(dados.valorTotal),
            valorEntrada: Number(dados.valorEntrada) || 0,
            qtdParcelas: Number(dados.qtdParcelas),
            banco: dados.banco || null,
          });
          recado(`Venda fechada! Contrato ${resultado.numero} gerado com ${resultado.parcelas} parcela(s).`);
          recarregar();
        },
      },
    ],
  });

  // Simulacao ao vivo das parcelas
  const atualizarPrevia = () => {
    const dados = lerCampos(fundo);
    const total = Number(dados.valorTotal) || 0;
    const entrada = Number(dados.valorEntrada) || 0;
    const aVista = dados.formaPagamento === 'avista';
    const parcelas = aVista ? 1 : Number(dados.qtdParcelas) || 1;
    const previa = fundo.querySelector('#previa');
    const blocoParcelas = fundo.querySelector('#bloco-parcelas');

    blocoParcelas.style.display = aVista ? 'none' : '';

    if (entrada > total) {
      previa.className = 'aviso erro';
      previa.textContent = 'A entrada não pode ser maior que o valor da venda.';
      return;
    }

    previa.className = 'aviso';
    previa.innerHTML = aVista
      ? `Pagamento único de <b>${dinheiro(total)}</b>, quitado no ato da emissão do contrato.`
      : `Entrada de <b>${dinheiro(entrada)}</b> + <b>${parcelas}x</b> de
         <b>${dinheiro((total - entrada) / parcelas)}</b>.
         Primeiro vencimento em 30 dias.`;
  };

  for (const campo of fundo.querySelectorAll('[name]')) {
    campo.addEventListener('input', atualizarPrevia);
    campo.addEventListener('change', atualizarPrevia);
  }
  atualizarPrevia();
}

// ---------------------------------------------------------------------
// Nova negociacao
// ---------------------------------------------------------------------
async function abrirNovaNegociacao() {
  const listas = await api.ler('/api/apoio/listas');

  if (!listas.clientes.length) {
    recado('Cadastre um cliente antes de abrir uma negociação.', 'erro');
    return abrirNovoCliente();
  }

  janela({
    titulo: 'Nova negociação',
    descricao: 'A negociação entra no funil na etapa "Lead novo".',
    corpo: `
      <div class="campo">
        <label for="clienteId">Cliente</label>
        <select name="clienteId" id="clienteId">
          ${listas.clientes.map((c) => `<option value="${c.id}">${escapar(c.nome)} — ${escapar(c.cpf)}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="motoId">Moto de interesse</label>
        <select name="motoId" id="motoId">
          <option value="">— ainda não definida —</option>
          ${listas.motosDisponiveis.map((m) =>
            `<option value="${m.id}" data-preco="${m.preco_venda}">
               ${escapar(m.codigo)} · ${escapar(m.marca)} ${escapar(m.modelo)} ${m.ano} — ${dinheiro(m.preco_venda)}
             </option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="valorNegociado">Valor negociado</label>
        <input type="number" step="0.01" name="valorNegociado" id="valorNegociado" value="0">
        <p class="dica">Preenchido com o preço de tabela ao escolher a moto; ajuste se houver desconto.</p>
      </div>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Criar negociação',
        aoClicar: async ({ fundo }) => {
          const dados = lerCampos(fundo);
          await api.criar('/api/negociacoes', {
            clienteId: Number(dados.clienteId),
            motoId: dados.motoId ? Number(dados.motoId) : null,
            valorNegociado: Number(dados.valorNegociado) || 0,
          });
          recado('Negociação criada no funil.');
          recarregar();
        },
      },
    ],
  });

  // ao escolher a moto, sugere o preco de tabela
  const seletorMoto = document.querySelector('#motoId');
  seletorMoto?.addEventListener('change', () => {
    const opcao = seletorMoto.selectedOptions[0];
    const campoValor = document.querySelector('#valorNegociado');
    if (opcao?.dataset.preco) campoValor.value = opcao.dataset.preco;
  });
}

// =====================================================================
//  CLIENTES
// =====================================================================
async function montarClientes(area, contexto) {
  const clientes = await api.ler('/api/clientes');
  const podeEditar = contexto.permissoes['comercial.escrever'];

  area.innerHTML = `
    <h1 class="titulo">Clientes</h1>
    <p class="subtitulo">
      ${contexto.usuario.perfil === 'dono'
        ? 'Todos os clientes da loja.'
        : 'Somente os clientes da sua carteira (RNFR-01.1).'}
    </p>

    <div class="barra-acoes">
      ${podeEditar ? '<button class="btn" id="novo-cliente">+ Novo cliente</button>' : ''}
      <input class="filtro" id="busca" placeholder="Buscar por nome, CPF ou telefone…" style="min-width:280px">
      <span class="espaco"></span>
      <span style="font-size:12px;color:var(--texto-fraco)">${clientes.length} cliente(s)</span>
    </div>

    <div class="card tabela" id="lista"></div>`;

  const desenhar = (lista) => {
    document.getElementById('lista').innerHTML = tabela({
      colunas: [
        { titulo: 'Nome', valor: (l) => escapar(l.nome) },
        { titulo: 'CPF', valor: (l) => escapar(l.cpf) },
        { titulo: 'Telefone', valor: (l) => escapar(l.telefone) },
        { titulo: 'Cidade', valor: (l) => escapar(l.cidade || '—') },
        { titulo: 'Origem', valor: (l) => `<span class="tag t-neutro">${escapar(l.origem || '—')}</span>` },
        { titulo: 'Vendedor', valor: (l) => escapar(l.vendedor_nome || '—') },
        { titulo: 'Negociações', alinha: 'direita', valor: (l) => numero(l.negociacoes) },
        { titulo: 'Compras', alinha: 'direita', valor: (l) => numero(l.compras) },
      ],
      linhas: lista,
      vazio: 'Nenhum cliente encontrado.',
    });
  };
  desenhar(clientes);

  document.getElementById('novo-cliente')?.addEventListener('click', abrirNovoCliente);
  document.getElementById('busca').addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    desenhar(clientes.filter((c) =>
      c.nome.toLowerCase().includes(termo) ||
      c.cpf.includes(termo) ||
      (c.telefone || '').includes(termo)));
  });
}

function abrirNovoCliente() {
  janela({
    titulo: 'Novo cliente',
    descricao: 'O CPF é conferido pelo sistema; o telefone é obrigatório (RNFR-01.2).',
    corpo: `
      <div class="campo">
        <label for="nome">Nome completo</label>
        <input name="nome" id="nome" placeholder="Ex.: Maria Aparecida da Silva">
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="cpf">CPF</label>
          <input name="cpf" id="cpf" placeholder="000.000.000-00" inputmode="numeric">
        </div>
        <div class="campo">
          <label for="telefone">Telefone com DDD</label>
          <input name="telefone" id="telefone" placeholder="(15) 99999-0000" inputmode="tel">
        </div>
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="cidade">Cidade</label>
          <input name="cidade" id="cidade" value="Itapetininga">
        </div>
        <div class="campo">
          <label for="origem">Como chegou até a loja</label>
          <select name="origem" id="origem">
            <option>Loja</option>
            <option>Instagram</option>
            <option>Indicacao</option>
            <option>Site</option>
            <option>Outro</option>
          </select>
        </div>
      </div>
      <div class="campo">
        <label for="email">E-mail (opcional)</label>
        <input type="email" name="email" id="email">
      </div>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Cadastrar cliente',
        aoClicar: async ({ fundo }) => {
          await api.criar('/api/clientes', lerCampos(fundo));
          recado('Cliente cadastrado.');
          recarregar();
        },
      },
    ],
  });
}

// =====================================================================
//  RF-02 — SAC
// =====================================================================
async function montarSac(area, contexto) {
  const chamados = await api.ler('/api/chamados');
  const podeEditar = contexto.permissoes['sac.escrever'];
  const atrasados = chamados.filter((c) => c.situacao_real === 'atrasado').length;

  area.innerHTML = `
    <h1 class="titulo">SAC — chamados de pós-venda</h1>
    <p class="subtitulo">
      Chamados sem movimentação por mais de cinco dias são marcados
      automaticamente como atrasados (RNFR-02.1).
    </p>

    ${atrasados ? `<div class="aviso erro">${atrasados} chamado(s) sem movimentação há mais de cinco dias.</div>` : ''}

    <div class="barra-acoes">
      ${podeEditar ? '<button class="btn" id="novo-chamado">+ Abrir chamado</button>' : ''}
      <span class="espaco"></span>
      <span style="font-size:12px;color:var(--texto-fraco)">${chamados.length} chamado(s)</span>
    </div>

    <div class="card tabela">
      ${tabela({
        colunas: [
          { titulo: 'Nº', valor: (l) => escapar(l.numero) },
          { titulo: 'Cliente', valor: (l) => escapar(l.cliente_nome) },
          { titulo: 'Assunto', valor: (l) => escapar(l.assunto) },
          { titulo: 'Moto', valor: (l) => escapar(l.moto_codigo || '—') },
          { titulo: 'Abertura', valor: (l) => data(l.data_abertura) },
          { titulo: 'Última movimentação', valor: (l) => data(l.ultima_movimentacao) },
          { titulo: 'Responsável', valor: (l) => escapar(l.responsavel_nome || '—') },
          { titulo: 'Situação', valor: (l) => etiqueta(l.situacao_real) },
          {
            titulo: '',
            valor: (l) => (podeEditar && l.situacao !== 'resolvido'
              ? `<button class="btn pequeno linha" data-resolver="${l.id}">Resolver</button>`
              : ''),
          },
        ],
        linhas: chamados.map((c) => ({ ...c, __destaque: c.situacao_real === 'atrasado' })),
        vazio: 'Nenhum chamado aberto.',
      })}
    </div>`;

  document.getElementById('novo-chamado')?.addEventListener('click', abrirNovoChamado);

  for (const botao of area.querySelectorAll('[data-resolver]')) {
    botao.addEventListener('click', async () => {
      if (!await confirmar('Marcar este chamado como resolvido?')) return;
      await api.alterar(`/api/chamados/${botao.dataset.resolver}`, { situacao: 'resolvido' });
      recado('Chamado resolvido.');
      recarregar();
    });
  }
}

async function abrirNovoChamado() {
  const listas = await api.ler('/api/apoio/listas');

  janela({
    titulo: 'Abrir chamado de pós-venda',
    descricao: 'A abertura é concluída nesta única tela (RNFR-02.3).',
    corpo: `
      <div class="campo">
        <label for="clienteId">Cliente</label>
        <select name="clienteId" id="clienteId">
          ${listas.clientes.map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="assunto">Assunto</label>
        <select name="assunto" id="assunto">
          <option>Emplacamento atrasado</option>
          <option>Revisão de garantia</option>
          <option>Segunda via do contrato</option>
          <option>Dúvida sobre parcelas</option>
          <option>Problema mecânico</option>
          <option>Transferência de titularidade</option>
          <option>Outro</option>
        </select>
      </div>
      <div class="campo">
        <label for="responsavelId">Responsável</label>
        <select name="responsavelId" id="responsavelId">
          ${listas.funcionarios.map((f) => `<option value="${f.id}">${escapar(f.nome)} (${escapar(f.setor)})</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="descricao">Descrição</label>
        <textarea name="descricao" id="descricao" rows="3" placeholder="O que o cliente relatou"></textarea>
      </div>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Abrir chamado',
        aoClicar: async ({ fundo }) => {
          const dados = lerCampos(fundo);
          await api.criar('/api/chamados', {
            clienteId: Number(dados.clienteId),
            assunto: dados.assunto,
            descricao: dados.descricao,
            responsavelId: Number(dados.responsavelId),
          });
          recado('Chamado aberto.');
          recarregar();
        },
      },
    ],
  });
}
