// =====================================================================
//  desenho-der.js - motor de desenho dos diagramas de banco de dados
//
//  Desenha em SVG, na notacao ensinada em Banco de Dados I (Heuser /
//  BrModelo): entidade = retangulo, relacionamento = losango, atributo
//  = elipse com bolinha preta (identificador) ou branca (comum), e a
//  cardinalidade escrita como (minimo, maximo) ao lado de cada entidade.
// =====================================================================

export const TINTA = '#1B1A17';
export const LINHA = '#3D3A33';
export const FUNDO_ENT = '#FFF7E3';
export const FUNDO_REL = '#EAF1FF';
export const FUNDO_ATR = '#FFFFFF';

export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function bordaRet(cx, cy, w, h, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const sx = dx === 0 ? Infinity : (w / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (h / 2) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [cx + dx * s, cy + dy * s];
}

export function bordaElipse(cx, cy, rx, ry, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * k, cy + dy * k];
}

// ---------------------------------------------------------------- formas

export function entidade({ x, y, nome, w = 230, h = 74, fraca = false }) {
  const meio = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3"
      fill="${FUNDO_ENT}" stroke="${TINTA}" stroke-width="2.4"/>`;
  const dupla = fraca
    ? `<rect x="${x - w / 2 + 7}" y="${y - h / 2 + 7}" width="${w - 14}" height="${h - 14}" rx="2"
         fill="none" stroke="${TINTA}" stroke-width="1.4"/>`
    : '';
  return `${meio}${dupla}
    <text x="${x}" y="${y + 7}" text-anchor="middle" font-size="29" font-weight="700"
      letter-spacing="0.6" fill="${TINTA}">${esc(nome)}</text>`;
}

export function relacionamento({ x, y, nome, w = 168, h = 82, dupla = false }) {
  const d = (ww, hh) => `${x},${y - hh / 2} ${x + ww / 2},${y} ${x},${y + hh / 2} ${x - ww / 2},${y}`;
  const dentro = dupla
    ? `<polygon points="${d(w - 16, h - 16)}" fill="none" stroke="${TINTA}" stroke-width="1.3"/>`
    : '';
  const palavras = String(nome).split(' ');
  let linhas = [nome];
  if (palavras.length > 1 && nome.length > 11) {
    const meio = Math.ceil(palavras.length / 2);
    linhas = [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')];
  }
  const texto = linhas
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? (linhas.length === 1 ? 5 : -3) : 16}">${esc(l)}</tspan>`)
    .join('');
  return `<polygon points="${d(w, h)}" fill="${FUNDO_REL}" stroke="${TINTA}" stroke-width="2.2"/>${dentro}
    <text x="${x}" y="${y}" text-anchor="middle" font-size="19" fill="${TINTA}">${texto}</text>`;
}

// atributo: tipo = 'chave' | 'comum' | 'derivado' | 'multi' | 'parcial'
export function atributo({ x, y, nome, tipo = 'comum', de }) {
  const rx = Math.max(58, 12 + nome.length * 6.6) + (tipo === 'multi' ? 7 : 0);
  const ry = 31;
  const [ax, ay] = bordaElipse(x, y, rx, ry, de[0], de[1]);
  const traco = tipo === 'derivado' ? ' stroke-dasharray="7 5"' : '';
  const duplo = tipo === 'multi'
    ? `<ellipse cx="${x}" cy="${y}" rx="${rx - 6}" ry="${ry - 6}" fill="none" stroke="${TINTA}" stroke-width="1.2"/>` : '';
  const cheia = tipo === 'chave';
  const sublinhado = cheia || tipo === 'parcial'
    ? ` text-decoration="underline"${tipo === 'parcial' ? ' style="text-decoration-style:dashed"' : ''}` : '';
  return `<line x1="${ax}" y1="${ay}" x2="${de[0]}" y2="${de[1]}" stroke="${LINHA}" stroke-width="1.6"/>
    <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${FUNDO_ATR}" stroke="${TINTA}" stroke-width="1.8"${traco}/>${duplo}
    <circle cx="${ax}" cy="${ay}" r="6" fill="${cheia ? TINTA : '#FFFFFF'}" stroke="${TINTA}" stroke-width="1.6"/>
    <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="18" fill="${TINTA}"${sublinhado}>${esc(nome)}</text>`;
}

// ------------------------------------------------- ligacoes com cardinalidade

// perna: { ent, card, via: [[x,y]...], recuo }
export function pernas(rel, lista, mapa) {
  let saida = '';
  for (const p of lista) {
    const e = mapa[p.ent];
    const pontos = [[rel.x, rel.y], ...(p.via || [])];
    const ultimo = pontos[pontos.length - 1];
    const fim = bordaRet(e.x, e.y, e.w || 230, e.h || 74, ultimo[0], ultimo[1]);
    fim[0] += p.dx || 0; fim[1] += p.dy || 0;
    pontos.push(fim);
    const d = pontos.map((q) => `${q[0]},${q[1]}`).join(' ');
    saida += `<polyline points="${d}" fill="none" stroke="${LINHA}" stroke-width="1.9"/>`;
    // rotulo da cardinalidade junto da entidade
    const a = pontos[pontos.length - 2], b = fim;
    const vx = a[0] - b[0], vy = a[1] - b[1];
    const n = Math.hypot(vx, vy) || 1;
    const rec = p.recuo ?? 40;
    const px = b[0] + (vx / n) * rec, py = b[1] + (vy / n) * rec;
    const ox = (-vy / n) * (p.lado ?? 1) * 17, oy = (vx / n) * (p.lado ?? 1) * 17;
    saida += `<text x="${px + ox}" y="${py + oy + 5}" text-anchor="middle" font-size="22"
        font-weight="700" fill="#0F3D91">${esc(p.card)}</text>`;
  }
  return saida;
}


// medida da elipse de um atributo (usada pelo anti-colisao)
export function medirAtributo(nome, tipo = 'comum') {
  return { rx: Math.max(58, 12 + nome.length * 6.6) + (tipo === 'multi' ? 7 : 0), ry: 31 };
}

// entidade com a coroa de atributos ao redor (figuras de detalhe)
export function entidadeComAtributos({ x, y, nome, w = 260, h = 82, fraca = false, atributos,
                                       de = -90, ate = 270, raios = [250, 370] }) {
  const n = atributos.length;
  const passo = (ate - de) / n;
  const postas = [{ x, y, rx: w / 2 + 6, ry: h / 2 + 6 }];
  let elipses = '';
  for (let i = 0; i < n; i++) {
    const rad = ((de + passo * (i + 0.5)) * Math.PI) / 180;
    const m = medirAtributo(atributos[i].nome, atributos[i].tipo);
    let r = raios[i % raios.length];
    let ax = 0, ay = 0;
    for (let tentativa = 0; tentativa < 7; tentativa++) {
      ax = x + Math.cos(rad) * r;
      ay = y + Math.sin(rad) * r;
      const bate = postas.some((c) => Math.abs(c.x - ax) < c.rx + m.rx + 20 &&
                                      Math.abs(c.y - ay) < c.ry + m.ry + 16);
      if (!bate) break;
      r += 52;
    }
    postas.push({ x: ax, y: ay, rx: m.rx, ry: m.ry });
    elipses += atributo({ x: ax, y: ay, nome: atributos[i].nome, tipo: atributos[i].tipo, de: [x, y] });
  }
  return elipses + entidade({ x, y, nome, w, h, fraca });
}

export function pagina({ largura, altura, corpo, titulo }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}"
     width="${largura}" height="${altura}" font-family="Segoe UI, Calibri, system-ui, sans-serif">
    <rect width="${largura}" height="${altura}" fill="#FFFFFF"/>
    ${titulo ? `<text x="${largura / 2}" y="42" text-anchor="middle" font-size="27" font-weight="700"
       letter-spacing="0.5" fill="${TINTA}">${esc(titulo)}</text>` : ''}
    ${corpo}
  </svg>`;
}
