// Controle Financeiro pessoal - dados salvos no localStorage do navegador.

const CHAVE = 'controle-financeiro:v1';
const CATEGORIAS_PADRAO = [
  'Salário', 'Renda extra', 'Alimentação', 'Mercado', 'Moradia', 'Contas (água/luz/internet)',
  'Transporte', 'Saúde', 'Educação', 'Lazer', 'Roupas', 'Cartão de crédito', 'Outros'
];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (sel) => document.querySelector(sel);

let lancamentos = carregar();
let mesSelecionado = mesDe(hojeISO()); // "AAAA-MM"
let editandoId = null;

// ---------- dados ----------

function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lancamentos));
  } catch {
    alert('Não foi possível salvar neste navegador. Faça um backup para não perder os dados.');
  }
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mesDe(dataISO) { return dataISO.slice(0, 7); }

function somarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nomeMes(mes, curto = false) {
  const [a, m] = mes.split('-').map(Number);
  const opcoes = curto ? { month: 'short' } : { month: 'long', year: 'numeric' };
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', opcoes).replace('.', '');
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function dataBR(dataISO) {
  const [a, m, d] = dataISO.split('-');
  return `${d}/${m}/${a}`;
}

function lerValor(texto) {
  // aceita "1.234,56", "1234,56" e "1234.56"
  let t = String(texto).trim().replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

function doMes(mes) {
  return lancamentos.filter((l) => mesDe(l.data) === mes);
}

function totais(lista) {
  let entradas = 0, saidas = 0;
  for (const l of lista) {
    if (l.tipo === 'entrada') entradas += l.valor; else saidas += l.valor;
  }
  return { entradas, saidas, saldo: entradas - saidas };
}

// ---------- formulário ----------

function limparForm() {
  editandoId = null;
  $('#form').reset();
  $('#data').value = mesSelecionado === mesDe(hojeISO()) ? hojeISO() : `${mesSelecionado}-01`;
  $('#tituloForm').textContent = 'Novo lançamento';
  $('#btnSalvar').textContent = 'Adicionar';
  $('#btnCancelar').hidden = true;
}

$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const valor = lerValor($('#valor').value);
  if (!(valor > 0)) {
    alert('Digite um valor maior que zero. Ex.: 25,90');
    $('#valor').focus();
    return;
  }
  const item = {
    id: editandoId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    tipo: document.querySelector('input[name=tipo]:checked').value,
    data: $('#data').value,
    descricao: $('#descricao').value.trim(),
    categoria: $('#categoria').value.trim(),
    valor,
  };
  if (editandoId) {
    lancamentos = lancamentos.map((l) => (l.id === editandoId ? item : l));
  } else {
    lancamentos.push(item);
  }
  salvar();
  mesSelecionado = mesDe(item.data);
  limparForm();
  render();
});

$('#btnCancelar').addEventListener('click', limparForm);

function editar(id) {
  const l = lancamentos.find((x) => x.id === id);
  if (!l) return;
  editandoId = id;
  document.querySelector(`input[name=tipo][value=${l.tipo}]`).checked = true;
  $('#data').value = l.data;
  $('#descricao').value = l.descricao;
  $('#categoria').value = l.categoria;
  $('#valor').value = l.valor.toFixed(2).replace('.', ',');
  $('#tituloForm').textContent = 'Editar lançamento';
  $('#btnSalvar').textContent = 'Salvar alterações';
  $('#btnCancelar').hidden = false;
  $('#form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function excluir(id) {
  const l = lancamentos.find((x) => x.id === id);
  if (!l || !confirm(`Excluir "${l.descricao}" (${moeda.format(l.valor)})?`)) return;
  lancamentos = lancamentos.filter((x) => x.id !== id);
  salvar();
  if (editandoId === id) limparForm();
  render();
}

// ---------- tela ----------

function render() {
  $('#mesAtual').textContent = nomeMes(mesSelecionado);

  const doMesAtual = doMes(mesSelecionado);
  const t = totais(doMesAtual);
  $('#totalEntradas').textContent = moeda.format(t.entradas);
  $('#totalSaidas').textContent = moeda.format(t.saidas);
  const saldo = $('#saldo');
  saldo.textContent = moeda.format(t.saldo);
  saldo.className = 'valor ' + (t.saldo > 0 ? 'positivo' : t.saldo < 0 ? 'negativo' : '');

  renderCategorias();
  renderTabela(doMesAtual);
  renderGraficoCategorias(doMesAtual);
  renderGraficoMeses();
}

function renderCategorias() {
  const usadas = lancamentos.map((l) => l.categoria);
  const todas = [...new Set([...CATEGORIAS_PADRAO, ...usadas])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  $('#listaCategorias').innerHTML = todas.map((c) => `<option value="${esc(c)}">`).join('');
}

function renderTabela(lista) {
  const termo = $('#busca').value.trim().toLowerCase();
  const filtrada = lista
    .filter((l) => !termo || `${l.descricao} ${l.categoria}`.toLowerCase().includes(termo))
    .sort((a, b) => b.data.localeCompare(a.data));

  $('#tabela tbody').innerHTML = filtrada.map((l) => `
    <tr>
      <td class="data">${dataBR(l.data)}</td>
      <td class="desc">${esc(l.descricao)}</td>
      <td class="cat">${esc(l.categoria)}</td>
      <td class="num ${l.tipo === 'entrada' ? 'positivo' : 'negativo'}">${l.tipo === 'entrada' ? '+' : '−'} ${moeda.format(l.valor)}</td>
      <td class="acoes">
        <button type="button" data-editar="${l.id}">Editar</button>
        <button type="button" data-excluir="${l.id}" aria-label="Excluir">✕</button>
      </td>
    </tr>`).join('');

  $('#tabela').hidden = filtrada.length === 0;
  $('#vazio').hidden = filtrada.length > 0;
  $('#vazio').textContent = termo ? 'Nada encontrado.' : 'Nenhum lançamento neste mês.';
}

$('#tabela').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.editar) editar(b.dataset.editar);
  if (b.dataset.excluir) excluir(b.dataset.excluir);
});
$('#busca').addEventListener('input', () => renderTabela(doMes(mesSelecionado)));

$('#mesAnterior').addEventListener('click', () => { mesSelecionado = somarMeses(mesSelecionado, -1); limparForm(); render(); });
$('#mesSeguinte').addEventListener('click', () => { mesSelecionado = somarMeses(mesSelecionado, 1); limparForm(); render(); });

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- gráficos (SVG feito à mão) ----------

const tooltip = $('#tooltip');

function mostrarTooltip(e, html) {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  const x = Math.min(e.clientX + 12, window.innerWidth - tooltip.offsetWidth - 8);
  const y = Math.max(8, e.clientY - tooltip.offsetHeight - 12);
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}
function esconderTooltip() { tooltip.hidden = true; }

function ligarTooltips(container) {
  container.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('pointermove', (e) => mostrarTooltip(e, el.dataset.tip));
    el.addEventListener('pointerleave', esconderTooltip);
  });
}

function valorCurto(v) {
  if (v >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

// Desenha na largura real da tela, pra letra não encolher no celular
function larguraGrafico(el) {
  return Math.max(300, Math.round(el.clientWidth) || 480);
}

let timerResize;
window.addEventListener('resize', () => {
  clearTimeout(timerResize);
  timerResize = setTimeout(() => {
    renderGraficoCategorias(doMes(mesSelecionado));
    renderGraficoMeses();
  }, 150);
});

// Escala "bonita" pro eixo: 0 até um número redondo
function escalaMax(max) {
  if (max <= 0) return 100;
  const pot = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pot >= max) return m * pot;
  return 10 * pot;
}

// Barras horizontais: gastos do mês por categoria (uma série só, ordenada)
function renderGraficoCategorias(lista) {
  const el = $('#graficoCategorias');
  const porCat = {};
  for (const l of lista) if (l.tipo === 'saida') porCat[l.categoria] = (porCat[l.categoria] || 0) + l.valor;
  let itens = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  if (itens.length === 0) {
    el.innerHTML = '<p class="vazio">Sem gastos neste mês.</p>';
    return;
  }
  if (itens.length > 8) {
    const resto = itens.slice(7).reduce((s, [, v]) => s + v, 0);
    itens = [...itens.slice(0, 7), ['Demais categorias', resto]];
  }
  const total = itens.reduce((s, [, v]) => s + v, 0);
  const max = itens[0][1];

  const W = larguraGrafico(el), rotuloW = 130, valorW = 90, barraH = 18, passo = 34;
  const H = itens.length * passo;
  const larguraUtil = W - rotuloW - valorW;

  const linhas = itens.map(([cat, v], i) => {
    const y = i * passo;
    const w = Math.max(4, (v / max) * larguraUtil);
    const pct = ((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const nome = cat.length > 18 ? cat.slice(0, 17) + '…' : cat;
    const tip = `<b>${esc(cat)}</b>${moeda.format(v)} · ${pct}% dos gastos`;
    return `
      <g data-tip="${esc(tip)}">
        <rect x="0" y="${y}" width="${W}" height="${passo}" fill="transparent"/>
        <text x="${rotuloW - 10}" y="${y + passo / 2 + 4}" text-anchor="end">${esc(nome)}</text>
        <rect x="${rotuloW}" y="${y + (passo - barraH) / 2}" width="${w}" height="${barraH}" rx="4" fill="var(--azul)"/>
        <text x="${rotuloW + w + 8}" y="${y + passo / 2 + 4}" class="eixo-txt">${valorCurto(v)}</text>
      </g>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gastos por categoria">${linhas}</svg>`;
  ligarTooltips(el);
}

// Barras agrupadas: entradas x saídas nos últimos 6 meses
function renderGraficoMeses() {
  const el = $('#graficoMeses');
  const meses = Array.from({ length: 6 }, (_, i) => somarMeses(mesSelecionado, i - 5));
  const dados = meses.map((m) => ({ mes: m, ...totais(doMes(m)) }));
  const topo = escalaMax(Math.max(...dados.map((d) => Math.max(d.entradas, d.saidas))));

  const W = larguraGrafico(el), H = 220, esq = 64, base = H - 28, alturaUtil = base - 10;
  const grupoW = (W - esq) / meses.length;
  const barraW = Math.min(22, grupoW / 3);
  const y = (v) => base - (v / topo) * alturaUtil;

  const grade = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => {
    const v = topo * f, yy = y(v);
    return `<line x1="${esq}" x2="${W}" y1="${yy}" y2="${yy}" stroke="${f === 0 ? 'var(--eixo)' : 'var(--grade)'}" stroke-width="1"/>
            <text x="${esq - 8}" y="${yy + 4}" text-anchor="end" class="eixo-txt">${valorCurto(v)}</text>`;
  }).join('');

  // barra com topo arredondado e base reta
  const barra = (x, v, cor) => {
    if (v <= 0) return '';
    const h = Math.max(2, base - y(v)), r = Math.min(4, h, barraW / 2);
    return `<path d="M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barraW - r} Q${x + barraW},${base - h} ${x + barraW},${base - h + r} V${base} Z" fill="${cor}"/>`;
  };

  const grupos = dados.map((d, i) => {
    const cx = esq + grupoW * i + grupoW / 2;
    const tip = `<b>${nomeMes(d.mes)}</b>Entradas: ${moeda.format(d.entradas)}<br>Saídas: ${moeda.format(d.saidas)}<br>Saldo: ${moeda.format(d.saldo)}`;
    const atual = d.mes === mesSelecionado;
    return `
      <g data-tip="${esc(tip)}">
        <rect x="${cx - grupoW / 2}" y="0" width="${grupoW}" height="${H}" fill="transparent"/>
        ${barra(cx - barraW - 1, d.entradas, 'var(--azul)')}
        ${barra(cx + 1, d.saidas, 'var(--laranja)')}
        <text x="${cx}" y="${H - 8}" text-anchor="middle" style="${atual ? 'font-weight:700;fill:var(--texto)' : ''}">${nomeMes(d.mes, true)}</text>
      </g>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas dos últimos 6 meses">${grade}${grupos}</svg>`;
  ligarTooltips(el);
}

// ---------- exportar / backup ----------

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#btnExcel').addEventListener('click', () => {
  if (lancamentos.length === 0) return alert('Ainda não há lançamentos.');
  const celula = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const linhas = [...lancamentos]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((l) => [
      dataBR(l.data),
      l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      celula(l.descricao),
      celula(l.categoria),
      (l.tipo === 'entrada' ? l.valor : -l.valor).toFixed(2).replace('.', ','),
    ].join(';'));
  // ";" e vírgula decimal: o Excel em português abre direto em colunas
  const csv = '﻿' + ['Data;Tipo;Descrição;Categoria;Valor', ...linhas].join('\r\n');
  baixar(`controle-financeiro-${hojeISO()}.csv`, csv, 'text/csv;charset=utf-8');
});

$('#btnBackup').addEventListener('click', () => {
  baixar(`backup-financeiro-${hojeISO()}.json`, JSON.stringify(lancamentos, null, 2), 'application/json');
});

$('#arquivoBackup').addEventListener('change', async (e) => {
  const arquivo = e.target.files[0];
  e.target.value = '';
  if (!arquivo) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    const validos = Array.isArray(dados) && dados.every((l) =>
      l && l.id && (l.tipo === 'entrada' || l.tipo === 'saida') && /^\d{4}-\d{2}-\d{2}$/.test(l.data) && typeof l.valor === 'number');
    if (!validos) throw new Error();
    if (!confirm(`Restaurar ${dados.length} lançamentos? Os dados atuais deste aparelho serão substituídos.`)) return;
    lancamentos = dados;
    salvar();
    limparForm();
    render();
  } catch {
    alert('Arquivo de backup inválido.');
  }
});

// ---------- início ----------

limparForm();
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}
