// =====================================================================
//  Modulo de Recursos Humanos
//  RF-06 — cadastro de funcionarios, ferias e desligamentos
//  RF-07 — calculo da comissao dos vendedores
//  RNFR-06.1 — a folha e visivel somente ao perfil Dono
//  RNFR-06.3 — o historico do funcionario e preservado apos o desligamento
// =====================================================================

import {
  api, dinheiro, numero, tabela, etiqueta, escapar, data, mesPorExtenso,
  janela, lerCampos, recado, confirmar,
} from '../nucleo.js';
import { recarregar } from '../app.js';

export function abas(contexto) {
  const lista = [{ id: 'equipe', nome: 'Equipe' }];
  if (contexto.permissoes['folha.ler']) {
    lista.push({ id: 'folha', nome: 'Folha e comissões' });
  }
  lista.push({ id: 'ferias', nome: 'Férias' });
  return lista;
}

export async function montar(area, contexto, aba) {
  if (aba === 'folha') return montarFolha(area);
  if (aba === 'ferias') return montarFerias(area);
  return montarEquipe(area, contexto);
}

// =====================================================================
//  EQUIPE
// =====================================================================
async function montarEquipe(area, contexto) {
  const equipe = await api.ler('/api/rh/funcionarios');
  const podeEditar = contexto.permissoes['rh.escrever'];
  const veSalario = contexto.permissoes['folha.ler'];

  const ativos = equipe.filter((f) => f.situacao !== 'desligado');

  const colunas = [
    { titulo: 'Nome', valor: (l) => escapar(l.nome) },
    { titulo: 'Cargo', valor: (l) => escapar(l.cargo) },
    { titulo: 'Setor', valor: (l) => `<span class="tag t-neutro">${escapar(l.setor)}</span>` },
    { titulo: 'Admissão', valor: (l) => data(l.data_admissao) },
    { titulo: 'Tempo de casa', alinha: 'direita', valor: (l) => `${l.anos_casa} ano(s)` },
  ];

  // RNFR-06.1 — o salario nem chega ao navegador de quem nao e o Dono
  if (veSalario) {
    colunas.push(
      { titulo: 'Salário', alinha: 'direita', valor: (l) => dinheiro(l.salario) },
      { titulo: 'Comissão', alinha: 'direita',
        valor: (l) => (l.percentual_comissao ? `${l.percentual_comissao}%` : '—') },
    );
  }

  colunas.push(
    { titulo: 'Meta', alinha: 'direita', valor: (l) => (l.meta_mensal ? `${l.meta_mensal} motos` : '—') },
    { titulo: 'Situação', valor: (l) => etiqueta(l.situacao) },
  );

  if (podeEditar) {
    colunas.push({
      titulo: '',
      valor: (l) => (l.situacao === 'desligado'
        ? ''
        : `<button class="btn pequeno linha" data-editar="${l.id}">Editar</button>`),
    });
  }

  area.innerHTML = `
    <h1 class="titulo">Recursos Humanos — equipe</h1>
    <p class="subtitulo">
      ${ativos.length} funcionário(s) ativo(s).
      ${veSalario ? '' : 'Os dados de folha de pagamento são visíveis apenas ao proprietário.'}
    </p>

    <div class="barra-acoes">
      ${podeEditar ? '<button class="btn" id="novo">+ Admitir funcionário</button>' : ''}
      <span class="espaco"></span>
      <span style="font-size:12px;color:var(--texto-fraco)">
        ${equipe.length - ativos.length} desligado(s) no histórico
      </span>
    </div>

    <div class="card tabela">
      ${tabela({ colunas, linhas: equipe, vazio: 'Nenhum funcionário cadastrado.' })}
    </div>

    <p style="font-size:11.5px;color:var(--texto-fraco);margin-top:14px;line-height:1.6">
      O desligamento não apaga o registro: o histórico do funcionário é
      preservado e o acesso ao sistema é desativado (RNFR-06.3).
    </p>`;

  document.getElementById('novo')?.addEventListener('click', abrirNovoFuncionario);

  for (const botao of area.querySelectorAll('[data-editar]')) {
    botao.addEventListener('click', () => {
      abrirEdicao(equipe.find((f) => f.id === Number(botao.dataset.editar)));
    });
  }
}

function abrirNovoFuncionario() {
  janela({
    titulo: 'Admitir funcionário',
    corpo: `
      <div class="campo">
        <label for="nome">Nome completo</label>
        <input name="nome" id="nome">
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="cpf">CPF</label>
          <input name="cpf" id="cpf" placeholder="000.000.000-00">
        </div>
        <div class="campo">
          <label for="dataAdmissao">Data de admissão</label>
          <input type="date" name="dataAdmissao" id="dataAdmissao" value="${new Date().toISOString().slice(0, 10)}">
        </div>
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="cargo">Cargo</label>
          <input name="cargo" id="cargo" placeholder="Vendedor">
        </div>
        <div class="campo">
          <label for="setor">Setor</label>
          <select name="setor" id="setor">
            <option value="comercial">Comercial</option>
            <option value="financeiro">Financeiro</option>
            <option value="administrativo">Administrativo</option>
            <option value="oficina">Oficina</option>
          </select>
        </div>
      </div>
      <div class="linha-campos tres">
        <div class="campo">
          <label for="salario">Salário</label>
          <input type="number" step="0.01" name="salario" id="salario" value="0">
        </div>
        <div class="campo">
          <label for="percentualComissao">Comissão (%)</label>
          <input type="number" step="0.1" name="percentualComissao" id="percentualComissao" value="0">
        </div>
        <div class="campo">
          <label for="metaMensal">Meta (motos/mês)</label>
          <input type="number" name="metaMensal" id="metaMensal" value="0">
        </div>
      </div>
      <p class="dica" style="font-size:11.5px;color:var(--texto-fraco)">
        O acesso ao sistema (e-mail e senha) é criado pelo proprietário em
        Configurações, depois da admissão.
      </p>`,
    acoes: [
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Admitir',
        aoClicar: async ({ fundo }) => {
          await api.criar('/api/rh/funcionarios', lerCampos(fundo));
          recado('Funcionário admitido.');
          recarregar();
        },
      },
    ],
  });
}

function abrirEdicao(f) {
  janela({
    titulo: f.nome,
    descricao: `${f.cargo} · admitido em ${data(f.data_admissao)}`,
    corpo: `
      <div class="linha-campos">
        <div class="campo">
          <label for="cargo">Cargo</label>
          <input name="cargo" id="cargo" value="${escapar(f.cargo)}">
        </div>
        <div class="campo">
          <label for="setor">Setor</label>
          <select name="setor" id="setor">
            ${['comercial', 'financeiro', 'administrativo', 'oficina'].map((s) =>
              `<option value="${s}"${f.setor === s ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="linha-campos tres">
        <div class="campo">
          <label for="salario">Salário</label>
          <input type="number" step="0.01" name="salario" id="salario" value="${f.salario ?? 0}">
        </div>
        <div class="campo">
          <label for="percentualComissao">Comissão (%)</label>
          <input type="number" step="0.1" name="percentualComissao" id="percentualComissao" value="${f.percentual_comissao ?? 0}">
        </div>
        <div class="campo">
          <label for="metaMensal">Meta mensal</label>
          <input type="number" name="metaMensal" id="metaMensal" value="${f.meta_mensal ?? 0}">
        </div>
      </div>
      <div class="campo">
        <label for="situacao">Situação</label>
        <select name="situacao" id="situacao">
          <option value="ativo"${f.situacao === 'ativo' ? ' selected' : ''}>Ativo</option>
          <option value="ferias"${f.situacao === 'ferias' ? ' selected' : ''}>Em férias</option>
        </select>
      </div>`,
    acoes: [
      {
        texto: 'Desligar',
        estilo: 'perigo',
        aoClicar: async ({ fechar }) => {
          fechar();
          const ok = await confirmar(
            `Desligar ${f.nome}?`,
            'O histórico é preservado e o acesso ao sistema é desativado.');
          if (!ok) return 'manter';
          await api.alterar(`/api/rh/funcionarios/${f.id}`, { situacao: 'desligado' });
          recado('Funcionário desligado. Histórico preservado.');
          recarregar();
          return 'manter';
        },
      },
      { texto: 'Cancelar', estilo: 'linha' },
      {
        texto: 'Salvar',
        aoClicar: async ({ fundo }) => {
          await api.alterar(`/api/rh/funcionarios/${f.id}`, lerCampos(fundo));
          recado('Cadastro atualizado.');
          recarregar();
        },
      },
    ],
  });
}

// =====================================================================
//  RF-07 — FOLHA E COMISSOES  (somente o Dono)
// =====================================================================
async function montarFolha(area) {
  const folha = await api.ler('/api/rh/folha');

  area.innerHTML = `
    <h1 class="titulo">Folha de pagamento — ${mesPorExtenso(folha.competencia)}</h1>
    <p class="subtitulo">
      A comissão é calculada pelo sistema a partir das vendas concluídas, e
      entra no fechamento da folha (RF-07).
    </p>

    <div class="aviso info">
      Só entram na comissão as vendas com contrato assinado e a primeira
      parcela quitada (RNFR-07.1). Vendas fechadas cuja primeira parcela
      ainda não venceu ficam para a competência seguinte.
    </div>

    <div class="card tabela">
      ${tabela({
        colunas: [
          { titulo: 'Funcionário', valor: (l) => escapar(l.nome) },
          { titulo: 'Cargo', valor: (l) => escapar(l.cargo) },
          { titulo: 'Setor', valor: (l) => `<span class="tag t-neutro">${escapar(l.setor)}</span>` },
          { titulo: 'Salário', alinha: 'direita', valor: (l) => dinheiro(l.salario) },
          { titulo: '% comissão', alinha: 'direita',
            valor: (l) => (l.percentual_comissao ? `${l.percentual_comissao}%` : '—') },
          { titulo: 'Comissão', alinha: 'direita',
            valor: (l) => (l.comissao ? dinheiro(l.comissao) : '—') },
          { titulo: 'Total a pagar', alinha: 'direita', valor: (l) => `<b>${dinheiro(l.total)}</b>` },
        ],
        linhas: folha.funcionarios,
        vazio: 'Nenhum funcionário ativo.',
      })}
    </div>

    <div class="grade g3 mt">
      <div class="card kpi">
        <div class="rotulo">Total da folha</div>
        <div class="valor">${dinheiro(folha.total)}</div>
        <div class="delta">${numero(folha.funcionarios.length)} funcionário(s)</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Salários</div>
        <div class="valor">${dinheiro(folha.funcionarios.reduce((s, f) => s + f.salario, 0))}</div>
        <div class="delta">base fixa</div>
      </div>
      <div class="card kpi">
        <div class="rotulo">Comissões</div>
        <div class="valor">${dinheiro(folha.funcionarios.reduce((s, f) => s + f.comissao, 0))}</div>
        <div class="delta">variável do mês</div>
      </div>
    </div>`;
}

// =====================================================================
//  FERIAS
// =====================================================================
async function montarFerias(area) {
  const ferias = await api.ler('/api/rh/ferias');
  const proximas = ferias.filter((f) => f.situacao === 'programada' && f.faltam_dias >= 0 && f.faltam_dias <= 30);

  area.innerHTML = `
    <h1 class="titulo">Férias</h1>
    <p class="subtitulo">
      O sistema avisa com trinta dias de antecedência o vencimento do período
      de férias (RNFR-06.2).
    </p>

    ${proximas.length ? `
      <div class="aviso">
        <b>Férias nos próximos 30 dias:</b>
        ${proximas.map((f) => `${escapar(f.nome)} em ${f.faltam_dias} dia(s)`).join(' · ')}
      </div>` : ''}

    <div class="card tabela">
      ${tabela({
        colunas: [
          { titulo: 'Funcionário', valor: (l) => escapar(l.nome) },
          { titulo: 'Início', valor: (l) => data(l.data_inicio) },
          { titulo: 'Fim', valor: (l) => data(l.data_fim) },
          { titulo: 'Faltam', alinha: 'direita',
            valor: (l) => (l.situacao === 'concluida'
              ? '—'
              : l.faltam_dias >= 0 ? `${l.faltam_dias} dias` : 'em andamento') },
          { titulo: 'Situação', valor: (l) =>
            `<span class="tag ${l.situacao === 'concluida' ? 't-neutro' : 't-info'}">${escapar(l.situacao)}</span>` },
        ],
        linhas: ferias,
        vazio: 'Nenhum período de férias registrado.',
      })}
    </div>`;
}
