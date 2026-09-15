// =====================================================================
//  RF-03 — Controle do estoque de motocicletas
//  RNFR-03.1 — o tempo de patio e recalculado a cada consulta
//  RNFR-03.2 — motos com mais de 90 dias aparecem destacadas
//  RNFR-03.3 — o perfil Funcionario so consulta
// =====================================================================

import {
  api, dinheiro, numero, tabela, etiqueta, escapar, data,
  janela, lerCampos, recado,
} from '../nucleo.js';
import { recarregar } from '../app.js';

export function abas() {
  return [{ id: 'patio', nome: 'Pátio de veículos' }];
}

export async function montar(area, contexto) {
  const motos = await api.ler('/api/estoque');
  const podeEditar = contexto.permissoes['estoque.escrever'];

  const noPatio = motos.filter((m) => m.situacao !== 'vendida');
  const paradas = noPatio.filter((m) => m.parada_90_dias);
  const imobilizado = noPatio.reduce((s, m) => s + m.custo, 0);
  const contar = (situacao) => noPatio.filter((m) => m.situacao === situacao).length;

  area.innerHTML = `
    <h1 class="titulo">Estoque — pátio de veículos</h1>
    <p class="subtitulo">Entrada, saída, custo e tempo de pátio de cada motocicleta</p>

    <div class="grade g4">
      <div class="card kpi">
        <div class="rotulo">Motos no pátio</div>
        <div class="valor">${numero(noPatio.length)}</div>
        <div class="delta">${dinheiro(imobilizado)} imobilizados</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Reservadas</div>
        <div class="valor">${numero(contar('reservada'))}</div>
        <div class="delta">aguardando financiamento</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Em preparação</div>
        <div class="valor">${numero(contar('preparacao'))}</div>
        <div class="delta">oficina e limpeza</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Paradas há +90 dias</div>
        <div class="valor">${numero(paradas.length)}</div>
        <div class="delta">${paradas.length ? '<span class="down">avaliar promoção</span>' : 'nenhuma'}</div>
      </div>
    </div>

    ${paradas.length ? `
      <div class="aviso mt">
        <b>${paradas.length} moto(s) há mais de 90 dias no pátio:</b>
        ${paradas.map((m) => `${escapar(m.codigo)} (${escapar(m.modelo)}, ${m.dias_patio} dias)`).join(' · ')}
      </div>` : ''}

    <div class="barra-acoes mt">
      ${podeEditar
        ? '<button class="btn" id="nova-moto">+ Entrada de veículo</button>'
        : '<span class="tag t-neutro">Seu perfil tem acesso apenas de consulta ao estoque</span>'}
      <select class="filtro" id="filtro-situacao">
        <option value="patio">No pátio</option>
        <option value="">Todas (inclui vendidas)</option>
        <option value="disponivel">Disponíveis</option>
        <option value="reservada">Reservadas</option>
        <option value="preparacao">Em preparação</option>
        <option value="vendida">Vendidas</option>
      </select>
      <input class="filtro" id="busca" placeholder="Código, modelo ou placa…" style="min-width:220px">
      <span class="espaco"></span>
      <span style="font-size:12px;color:var(--texto-fraco)" id="contador"></span>
    </div>

    <div class="card tabela" id="lista"></div>`;

  const colunas = [
    { titulo: 'Código', valor: (l) => escapar(l.codigo) },
    { titulo: 'Modelo', valor: (l) => `${escapar(l.marca)} ${escapar(l.modelo)}` },
    { titulo: 'Ano', valor: (l) => escapar(l.ano) },
    { titulo: 'Cor', valor: (l) => escapar(l.cor || '—') },
    { titulo: 'Placa', valor: (l) => escapar(l.placa || '—') },
    { titulo: 'Entrada', valor: (l) => data(l.data_entrada) },
    { titulo: 'Dias no pátio', alinha: 'direita',
      valor: (l) => (l.parada_90_dias ? `<b class="down">${l.dias_patio}</b>` : numero(l.dias_patio)) },
    { titulo: 'Custo', alinha: 'direita', valor: (l) => dinheiro(l.custo) },
    { titulo: 'Preço de venda', alinha: 'direita', valor: (l) => dinheiro(l.preco_venda) },
    { titulo: 'Margem', alinha: 'direita', valor: (l) => dinheiro(l.margem) },
    { titulo: 'Situação', valor: (l) => etiqueta(l.situacao) },
  ];
  if (podeEditar) {
    colunas.push({
      titulo: '',
      valor: (l) => (l.situacao === 'vendida' ? '' : `<button class="btn pequeno linha" data-editar="${l.id}">Editar</button>`),
    });
  }

  const desenhar = () => {
    const situacao = document.getElementById('filtro-situacao').value;
    const termo = document.getElementById('busca').value.toLowerCase();

    let lista = motos;
    if (situacao === 'patio') lista = lista.filter((m) => m.situacao !== 'vendida');
    else if (situacao) lista = lista.filter((m) => m.situacao === situacao);
    if (termo) {
      lista = lista.filter((m) =>
        m.codigo.toLowerCase().includes(termo) ||
        m.modelo.toLowerCase().includes(termo) ||
        (m.placa || '').toLowerCase().includes(termo));
    }

    document.getElementById('lista').innerHTML = tabela({
      colunas,
      linhas: lista.map((m) => ({ ...m, __destaque: !!m.parada_90_dias })),
      vazio: 'Nenhuma moto encontrada com esse filtro.',
    });
    document.getElementById('contador').textContent = `${lista.length} moto(s)`;

    for (const botao of document.querySelectorAll('[data-editar]')) {
      botao.addEventListener('click', () => {
        abrirEdicao(motos.find((m) => m.id === Number(botao.dataset.editar)));
      });
    }
  };

  document.getElementById('filtro-situacao').addEventListener('change', desenhar);
  document.getElementById('busca').addEventListener('input', desenhar);
  document.getElementById('nova-moto')?.addEventListener('click', abrirNovaMoto);
  desenhar();
}

function abrirNovaMoto() {
  const hoje = new Date().toISOString().slice(0, 10);
  janela({
    titulo: 'Entrada de veículo',
    descricao: 'A data de entrada é a base do cálculo de tempo de pátio.',
    corpo: `
      <div class="linha-campos tres">
        <div class="campo">
          <label for="codigo">Código interno</label>
          <input name="codigo" id="codigo" placeholder="MM-0241">
        </div>
        <div class="campo">
          <label for="marca">Marca</label>
          <select name="marca" id="marca">
            <option>Honda</option><option>Yamaha</option><option>Suzuki</option>
            <option>Kawasaki</option><option>Shineray</option><option>Outra</option>
          </select>
        </div>
        <div class="campo">
          <label for="modelo">Modelo</label>
          <input name="modelo" id="modelo" placeholder="CG 160 Titan">
        </div>
      </div>

      <div class="linha-campos tres">
        <div class="campo">
          <label for="ano">Ano</label>
          <input type="number" name="ano" id="ano" value="${new Date().getFullYear()}">
        </div>
        <div class="campo">
          <label for="cor">Cor</label>
          <input name="cor" id="cor" placeholder="Preta">
        </div>
        <div class="campo">
          <label for="km">Quilometragem</label>
          <input type="number" name="km" id="km" value="0">
        </div>
      </div>

      <div class="linha-campos tres">
        <div class="campo">
          <label for="placa">Placa</label>
          <input name="placa" id="placa" placeholder="ABC-1D23">
        </div>
        <div class="campo">
          <label for="tipo">Tipo</label>
          <select name="tipo" id="tipo">
            <option value="seminova">Seminova</option>
            <option value="nova">Nova</option>
          </select>
        </div>
        <div class="campo">
          <label for="dataEntrada">Data de entrada</label>
          <input type="date" name="dataEntrada" id="dataEntrada" value="${hoje}">
        </div>
      </div>

      <div class="linha-campos">
        <div class="campo">
          <label for="custo">Custo de aquisição</label>
          <input type="number" step="0.01" name="custo" id="custo" value="0">
        </div>
        <div class="campo">
          <label for="precoVenda">Preço de venda</label>
          <input type="number" step="0.01" name="precoVenda" id="precoVenda" value="0">
        </div>
      </div>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Registrar entrada',
        aoClicar: async ({ fundo }) => {
          await api.criar('/api/estoque', lerCampos(fundo));
          recado('Moto registrada no pátio.');
          recarregar();
        },
      },
    ],
  });
}

function abrirEdicao(moto) {
  janela({
    titulo: `${moto.codigo} — ${moto.marca} ${moto.modelo}`,
    descricao: `${moto.dias_patio} dias no pátio · entrada em ${data(moto.data_entrada)}`,
    corpo: `
      <div class="linha-campos">
        <div class="campo">
          <label for="situacao">Situação</label>
          <select name="situacao" id="situacao">
            <option value="disponivel"${moto.situacao === 'disponivel' ? ' selected' : ''}>Disponível</option>
            <option value="reservada"${moto.situacao === 'reservada' ? ' selected' : ''}>Reservada</option>
            <option value="preparacao"${moto.situacao === 'preparacao' ? ' selected' : ''}>Em preparação</option>
          </select>
        </div>
        <div class="campo">
          <label for="cor">Cor</label>
          <input name="cor" id="cor" value="${escapar(moto.cor || '')}">
        </div>
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="placa">Placa</label>
          <input name="placa" id="placa" value="${escapar(moto.placa || '')}">
        </div>
        <div class="campo">
          <label for="km">Quilometragem</label>
          <input type="number" name="km" id="km" value="${moto.km}">
        </div>
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="custo">Custo</label>
          <input type="number" step="0.01" name="custo" id="custo" value="${moto.custo}">
        </div>
        <div class="campo">
          <label for="precoVenda">Preço de venda</label>
          <input type="number" step="0.01" name="precoVenda" id="precoVenda" value="${moto.preco_venda}">
        </div>
      </div>
      <p class="dica" style="font-size:11.5px;color:var(--texto-fraco)">
        A baixa por venda não é feita aqui: ela acontece sozinha quando a
        venda é fechada no módulo Comercial.
      </p>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Salvar',
        aoClicar: async ({ fundo }) => {
          await api.alterar(`/api/estoque/${moto.id}`, lerCampos(fundo));
          recado('Moto atualizada.');
          recarregar();
        },
      },
    ],
  });
}
