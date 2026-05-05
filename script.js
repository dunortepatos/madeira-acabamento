// ── State ──────────────────────────────────────────────────────────────
const state = {
  sortCol: 'produto',
  sortDir: 1,
  query: '',
  categoria: '',
  subcategoria: ''
};

// ── Category config (ordem alfabética) ────────────────────────────────
const BASE_CATEGORIAS = [
  { id: 'ALISARES',   label: 'Alisares',   icon: '📏', cls: 'cat-alisares',   sub: [] },
  { id: 'ASSOALHOS',  label: 'Assoalhos',  icon: '🏠', cls: 'cat-assoalhos',  sub: [] },
  { id: 'DECKS',      label: 'Decks',      icon: '🌿', cls: 'cat-decks',      sub: [] },
  { id: 'FECHADURAS', label: 'Fechaduras', icon: '🔐', cls: 'cat-fechaduras', sub: ['3F', 'IMAB', 'TODAS'] },
  { id: 'LAMBRIL',    label: 'Lambril',    icon: '📐', cls: 'cat-lambril',    sub: [] },
  { id: 'OUTROS',     label: 'Outros',     icon: '📦', cls: 'cat-outros',     sub: [] },
  { id: 'PORTAIS',    label: 'Portais',    icon: '🏛️', cls: 'cat-portais',    sub: [] },
  { id: 'PORTAS',     label: 'Portas',     icon: '🚪', cls: 'cat-portas',     sub: ['MACIÇA', 'PRANCHETA', 'SÓLIDA', 'TODAS'] },
  { id: 'PUXADORES',  label: 'Puxadores',  icon: '🔩', cls: 'cat-puxadores',  sub: [] },
  { id: 'RIPADOS',    label: 'Ripados',    icon: '🪵', cls: 'cat-ripados',    sub: [] },
];
const CATEGORIAS = BASE_CATEGORIAS;

// ── Screens ────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Format currency ────────────────────────────────────────────────────
function formatBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sortByLabel(a, b) {
  return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
}

function sortSubcats(subcats) {
  return [...subcats].sort((a, b) => {
    if (a === 'TODAS') return 1;
    if (b === 'TODAS') return -1;
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
  });
}

function categoryLabelFromId(id) {
  return String(id || '')
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function classFromCategory(id) {
  return 'cat-' + String(id || 'outros')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getCatalogCategories() {
  const map = new Map();
  const baseMap = new Map(BASE_CATEGORIAS.map(cat => [cat.id, { ...cat }]));
  getProdutos().forEach(produto => {
    const id = String(produto.categoria || 'OUTROS').trim().toUpperCase();
    if (!id) return;
    if (!map.has(id)) {
      const base = baseMap.get(id);
      map.set(id, base ? { ...base } : {
        id,
        label: categoryLabelFromId(id),
        icon: '📦',
        cls: classFromCategory(id),
        sub: [],
      });
    }
  });
  if (!map.has('OUTROS')) map.set('OUTROS', { ...baseMap.get('OUTROS') });
  return [...map.values()];
}

// ── Build category cards ───────────────────────────────────────────────
function buildCategories() {
  const grid = document.getElementById('catGrid');
  grid.innerHTML = '';
  getCatalogCategories().sort(sortByLabel).forEach(cat => {
    const div = document.createElement('div');
    div.className = `cat-card ${cat.cls}`;
    div.innerHTML = `<span class="cat-icon">${cat.icon}</span><span class="cat-name">${cat.label}</span>`;
    div.addEventListener('click', () => onCatClick(cat));
    grid.appendChild(div);
  });
}

function onCatClick(cat) {
  state.categoria = cat.id;
  state.subcategoria = '';
  if (cat.sub.length > 0) {
    buildSubcats(cat);
    showScreen('screen-subcat');
  } else {
    openProducts(cat.id, '');
  }
}

// ── Build subcategory cards ────────────────────────────────────────────
function buildSubcats(cat) {
  document.getElementById('subcatTitle').textContent = cat.label;
  const grid = document.getElementById('subcatGrid');
  grid.innerHTML = '';
  sortSubcats(cat.sub).forEach(sub => {
    const div = document.createElement('div');
    div.className = `subcat-card ${cat.cls}`;
    div.textContent = sub;
    div.addEventListener('click', () => {
      state.subcategoria = sub === 'TODAS' ? '' : sub;
      openProducts(cat.id, state.subcategoria);
    });
    grid.appendChild(div);
  });
}

// ── Open products screen ───────────────────────────────────────────────
function openProducts(categoria, subcategoria) {
  state.categoria = categoria;
  state.subcategoria = subcategoria;
  state.query = '';
  state.sortCol = 'produto';
  state.sortDir = 1;
  document.getElementById('searchInput').value = '';

  const cat = getCatalogCategories().find(c => c.id === categoria);
  let title = cat ? cat.label.toUpperCase() : categoria;
  if (subcategoria) title += ' › ' + subcategoria;
  document.getElementById('prodTitle').innerHTML = `<strong>${title}</strong>`;

  renderTable();
  showScreen('screen-products');
}

// ── Filter + sort ──────────────────────────────────────────────────────
function getFiltered() {
  const produtos = getProdutos();
  const q = state.query.trim().toLowerCase();

  let list = produtos.filter(p => {
    const catMatch = p.categoria === state.categoria;
    const subMatch = !state.subcategoria || p.subcategoria === state.subcategoria;
    if (!catMatch || !subMatch) return false;
    if (!q) return true;
    return p.codigo.toLowerCase().includes(q) || p.produto.toLowerCase().includes(q);
  });

  list.sort((a, b) => {
    let va = a[state.sortCol];
    let vb = b[state.sortCol];
    if (state.sortCol === 'valor') { va = Number(va); vb = Number(vb); }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return -state.sortDir;
    if (va > vb) return  state.sortDir;
    return 0;
  });

  return list;
}

// ── Render table ───────────────────────────────────────────────────────
function renderTable() {
  const list = getFiltered();
  const tbody = document.getElementById('prodTbody');
  const count = document.getElementById('resultCount');

  ['codigo', 'produto', 'valor'].forEach(col => {
    const th = document.getElementById('th-' + col);
    const arrow = th.querySelector('.sort-arrow');
    th.classList.toggle('sorted', state.sortCol === col);
    arrow.textContent = state.sortCol === col ? (state.sortDir === 1 ? ' ▲' : ' ▼') : ' ⇅';
  });

  count.textContent = list.length + (list.length === 1 ? ' produto' : ' produtos') + ' — clique no valor para calcular';

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="table-empty">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, index) => `
    <tr>
      <td class="td-code">${p.codigo}</td>
      <td class="td-name">${p.produto}</td>
      <td class="td-price">
        <button class="price-button" type="button" data-index="${index}" title="Clique para calcular">
          ${formatBRL(p.valor)}
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.price-button').forEach(button => {
    button.addEventListener('click', () => {
      const product = list[Number(button.dataset.index)];
      openCalcModal(product.produto, product.valor);
    });
  });
}

// ── Sort on header click ───────────────────────────────────────────────
function onSort(col) {
  if (state.sortCol === col) {
    state.sortDir *= -1;
  } else {
    state.sortCol = col;
    state.sortDir = 1;
  }
  renderTable();
}

// ── Search ─────────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e => {
  state.query = e.target.value;
  renderTable();
});

// ── Modal de cálculo ───────────────────────────────────────────────────
let _modalValorUnit = 0;

function openCalcModal(produto, valor) {
  _modalValorUnit = valor;
  document.getElementById('modalProduto').textContent = produto;
  document.getElementById('modalPrecoUnit').textContent = formatBRL(valor);
  document.getElementById('modalQty').value = 1;
  calcTotal();
  document.getElementById('calcModal').classList.add('open');
  document.getElementById('modalQty').select();
}

function closeModal() {
  document.getElementById('calcModal').classList.remove('open');
}

function parseQuantity(value) {
  const normalized = String(value).replace(',', '.');
  const qty = Number.parseFloat(normalized);
  if (!Number.isFinite(qty) || qty <= 0) return 1;
  return Math.round(qty * 100) / 100;
}

function clampQuantityInput(input) {
  const raw = input.value.replace(/[^\d,.]/g, '');
  const separator = raw.includes(',') ? ',' : '.';
  const parts = raw.split(/[,.]/);
  const integer = parts.shift() || '';
  const decimals = parts.join('');
  input.value = raw.includes('.') || raw.includes(',')
    ? `${integer}${separator}${decimals.slice(0, 2)}`
    : integer;
}

function calcTotal() {
  const input = document.getElementById('modalQty');
  clampQuantityInput(input);
  const qty = parseQuantity(input.value);
  document.getElementById('modalTotal').textContent = formatBRL(_modalValorUnit * qty);
}

function formatQtyInput() {
  const input = document.getElementById('modalQty');
  const qty = parseQuantity(input.value);
  input.value = Number.isInteger(qty)
    ? String(qty)
    : qty.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  calcTotal();
}

function changeQty(delta) {
  const input = document.getElementById('modalQty');
  const current = parseQuantity(input.value);
  const next = Math.max(0.01, Math.round((current + delta) * 100) / 100);
  input.value = Number.isInteger(next) ? String(next) : next.toFixed(2);
  calcTotal();
}

// Fecha o modal ao clicar no overlay
document.getElementById('calcModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Fecha com Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── Init ───────────────────────────────────────────────────────────────
buildCategories();
showScreen('screen-home');

// ── PWA service worker ─────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
