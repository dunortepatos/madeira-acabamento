// ── State ──────────────────────────────────────────────────────────────
let editingId = null;
let adminSortCol = 'produto';
let adminSortDir = 1;
let adminQuery = '';
let importPlan = null;

const BASE_CATEGORIAS_LIST = ['ALISARES','ASSOALHOS','DECKS','FECHADURAS','LAMBRIL','OUTROS','PORTAIS','PORTAS','PUXADORES','RIPADOS'];
let CATEGORIAS_LIST = [...BASE_CATEGORIAS_LIST];
const SUBCATS = {
  FECHADURAS: ['', '3F', 'IMAB'],
  PORTAS: ['', 'PRANCHETA', 'SÓLIDA', 'MACIÇA'],
};

// ── Toast ──────────────────────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Format ─────────────────────────────────────────────────────────────
function formatBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function categoryIdFromName(name) {
  return String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9À-Ú\s_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCustomCategories() {
  try {
    const data = JSON.parse(localStorage.getItem('custom_categories') || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveCustomCategories(categories) {
  localStorage.setItem('custom_categories', JSON.stringify([...new Set(categories)].sort()));
}

function refreshCategoryList() {
  const productCategories = getProdutos()
    .map(p => String(p.categoria || '').trim().toUpperCase())
    .filter(Boolean);
  CATEGORIAS_LIST = [...new Set([
    ...BASE_CATEGORIAS_LIST,
    ...getCustomCategories(),
    ...productCategories,
  ])].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function rememberCategory(categoria) {
  const id = categoryIdFromName(categoria);
  if (!id || CATEGORIAS_LIST.includes(id)) return id;
  const custom = getCustomCategories();
  custom.push(id);
  saveCustomCategories(custom);
  refreshCategoryList();
  populateAllCategorySelects(id);
  return id;
}

// ── Subcategory options ────────────────────────────────────────────────
function updateSubcatOptions() {
  const cat = document.getElementById('fCategoria').value;
  const sel = document.getElementById('fSubcategoria');
  const opts = SUBCATS[cat] || [''];
  const cur = sel.value;
  sel.innerHTML = opts.map(s => `<option value="${s}">${s || '(nenhuma)'}</option>`).join('');
  if (opts.includes(cur)) sel.value = cur;
}

// ── Populate category selects ──────────────────────────────────────────
function populateCatSelect(id, includeAll = true, selected = '') {
  const sel = document.getElementById(id);
  if (!sel) return;
  const cur = selected || sel.value;
  sel.innerHTML = (includeAll ? '<option value="">Todas</option>' : '') +
    CATEGORIAS_LIST.map(c => `<option value="${c}">${c}</option>`).join('');
  if (cur) sel.value = cur;
}

function populateAllCategorySelects(selected = '') {
  refreshCategoryList();
  populateCatSelect('fCategoria', false, selected || document.getElementById('fCategoria')?.value || 'RIPADOS');
  populateCatSelect('filterCat', true);
  populateImportCatSelect(selected);
  updateSubcatOptions();
}

function populateImportCatSelect(selected = '') {
  const sel = document.getElementById('importDefaultCat');
  if (!sel) return;
  const cur = selected || sel.value || 'RIPADOS';
  sel.innerHTML = CATEGORIAS_LIST.map(c => `<option value="${c}">${c}</option>`).join('');
  sel.value = CATEGORIAS_LIST.includes(cur) ? cur : 'RIPADOS';
  updateImportSubcatOptions();
}

function updateImportSubcatOptions() {
  const catSel = document.getElementById('importDefaultCat');
  const subSel = document.getElementById('importDefaultSubcat');
  if (!catSel || !subSel) return;
  const cur = subSel.value;
  const opts = SUBCATS[catSel.value] || [''];
  subSel.innerHTML = opts.map(s => `<option value="${s}">${s || '(nenhuma)'}</option>`).join('');
  if (opts.includes(cur)) subSel.value = cur;
}

function createCategory() {
  const name = prompt('Nome da nova categoria:');
  if (!name) return;
  const categoria = rememberCategory(name);
  if (!categoria) {
    toast('Categoria inválida.', true);
    return;
  }
  document.getElementById('fCategoria').value = categoria;
  updateSubcatOptions();
  toast('Categoria criada: ' + categoria);
}

// ── Get filtered + sorted admin list ──────────────────────────────────
function getAdminList() {
  const produtos = getProdutos();
  const q = adminQuery.trim().toLowerCase();
  const filterCat = document.getElementById('filterCat').value;

  let list = produtos.filter(p => {
    if (filterCat && p.categoria !== filterCat) return false;
    if (!q) return true;
    return p.codigo.toLowerCase().includes(q) ||
           p.produto.toLowerCase().includes(q) ||
           p.categoria.toLowerCase().includes(q);
  });

  list.sort((a, b) => {
    let va = a[adminSortCol];
    let vb = b[adminSortCol];
    if (adminSortCol === 'valor') { va = Number(va); vb = Number(vb); }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return -adminSortDir;
    if (va > vb) return  adminSortDir;
    return 0;
  });

  return list;
}

// ── Render admin table ────────────────────────────────────────────────
function renderAdminTable() {
  const list = getAdminList();
  const tbody = document.getElementById('adminTbody');
  const count = document.getElementById('adminCount');

  ['codigo','produto','valor','categoria'].forEach(col => {
    const th = document.getElementById('ath-' + col);
    if (!th) return;
    const arrow = th.querySelector('.sort-arrow');
    th.classList.toggle('sorted', adminSortCol === col);
    arrow.textContent = adminSortCol === col ? (adminSortDir === 1 ? ' ▲' : ' ▼') : ' ⇅';
  });

  count.textContent = list.length + (list.length === 1 ? ' produto' : ' produtos');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr data-id="${escapeHTML(p.id)}">
      <td class="td-code">${escapeHTML(p.codigo)}</td>
      <td class="td-name">${escapeHTML(p.produto)}</td>
      <td class="td-price">${formatBRL(p.valor)}</td>
      <td style="color:var(--text-muted);font-size:.8rem">${escapeHTML(p.categoria)}${p.subcategoria ? ' › '+escapeHTML(p.subcategoria) : ''}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-secondary btn-sm" onclick="editProd('${escapeHTML(p.id)}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProd('${escapeHTML(p.id)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Clear form ────────────────────────────────────────────────────────
function clearForm() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'Novo Produto';
  document.getElementById('fCodigo').value = '';
  document.getElementById('fProduto').value = '';
  document.getElementById('fValor').value = '';
  populateAllCategorySelects('RIPADOS');
  document.getElementById('fCategoria').value = 'RIPADOS';
  updateSubcatOptions();
  document.getElementById('fSubcategoria').value = '';
  document.getElementById('btnCancelEdit').style.display = 'none';
  document.getElementById('fCodigo').focus();
}

// ── Save product ───────────────────────────────────────────────────────
function saveProd() {
  const codigo = document.getElementById('fCodigo').value.trim();
  const produto = document.getElementById('fProduto').value.trim();
  const valorRaw = document.getElementById('fValor').value.trim().replace(',', '.');
  const categoria = rememberCategory(document.getElementById('fCategoria').value);
  const subcategoria = document.getElementById('fSubcategoria').value;

  if (!codigo || !produto || !valorRaw || !categoria) {
    toast('Preencha todos os campos obrigatórios.', true);
    return;
  }
  const valor = parseFloat(valorRaw);
  if (isNaN(valor) || valor < 0) {
    toast('Valor inválido.', true);
    return;
  }

  const lista = getProdutos();

  if (editingId) {
    const idx = lista.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], codigo, produto, valor, categoria, subcategoria };
      toast('Produto atualizado!');
    }
  } else {
    const newId = 'p_' + Date.now();
    lista.push({ id: newId, codigo, produto, valor, categoria, subcategoria });
    toast('Produto cadastrado!');
  }

  setProdutos(lista);
  refreshCategoryList();
  clearForm();
  renderAdminTable();
}

// ── Edit ──────────────────────────────────────────────────────────────
function editProd(id) {
  const p = getProdutos().find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'Editar Produto';
  document.getElementById('fCodigo').value = p.codigo;
  document.getElementById('fProduto').value = p.produto;
  document.getElementById('fValor').value = String(p.valor).replace('.', ',');
  populateAllCategorySelects(p.categoria);
  document.getElementById('fCategoria').value = p.categoria;
  updateSubcatOptions();
  document.getElementById('fSubcategoria').value = p.subcategoria || '';
  document.getElementById('btnCancelEdit').style.display = 'inline-flex';
  document.getElementById('fCodigo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Delete ────────────────────────────────────────────────────────────
function deleteProd(id) {
  if (!confirm('Excluir este produto?')) return;
  const lista = getProdutos().filter(p => p.id !== id);
  setProdutos(lista);
  toast('Produto excluído.');
  renderAdminTable();
}

// ── Export JSON ───────────────────────────────────────────────────────
function exportJSON() {
  const data = JSON.stringify(getProdutos(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'produtos_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Exportado com sucesso!');
}

// ── Import JSON ───────────────────────────────────────────────────────
function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('Formato inválido');
        // ensure all items have id
        data.forEach((p, i) => { if (!p.id) p.id = 'p_imp_' + i + '_' + Date.now(); });
        data.forEach(p => { p.categoria = rememberCategory(p.categoria || 'OUTROS'); });
        setProdutos(data);
        populateAllCategorySelects();
        renderAdminTable();
        toast('Importado: ' + data.length + ' produtos.');
      } catch {
        toast('Erro ao importar JSON.', true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── Import report (PDF / Excel) ───────────────────────────────────────
function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseBRNumber(value) {
  let text = String(value ?? '').trim();
  if (!text) return NaN;
  text = text.replace(/R\$/gi, '').replace(/\s/g, '');
  text = text.replace(/[^\d,.-]/g, '');
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) text = text.replace(/,/g, '');
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
}

function normalizeCategory(value, fallback) {
  const key = normalizeKey(value);
  const found = CATEGORIAS_LIST.find(cat => normalizeKey(cat) === key);
  if (found) return found;
  const custom = categoryIdFromName(value);
  return custom ? rememberCategory(custom) : (fallback || 'OUTROS');
}

function inferKnownCategory(produto) {
  const text = ' ' + normalizeText(produto).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  const rules = [
    { id: 'PORTAIS',    test: /\bportais?\b|\bportal\b/ },
    { id: 'PORTAS',     test: /\bportas?\b|\bpranchetas?\b|\bmacicas?\b|\bsolidas?\b/ },
    { id: 'ASSOALHOS',  test: /\ba+s+o+a+l+h?o?s?\b|\basoalhos?\b|\bassoalhos?\b/ },
    { id: 'ALISARES',   test: /\balisares?\b|\balizares?\b|\bguarnicoes?\b|\bguarnicao\b/ },
    { id: 'DECKS',      test: /\bdecks?\b/ },
    { id: 'FECHADURAS', test: /\bfechaduras?\b|\bfeixos?\b|\bfecho\b/ },
    { id: 'LAMBRIL',    test: /\blambris?\b|\blambril\b/ },
    { id: 'PUXADORES',  test: /\bpuxadores?\b/ },
    { id: 'RIPADOS',    test: /\bripados?\b/ },
    { id: 'TÁBOAS',     test: /\btaboas?\b|\btabuas?\b|\btaboes?\b/ },
  ];
  const found = rules.find(rule => rule.test.test(text));
  return found ? found.id : '';
}

function getCategorySeed(produto) {
  const words = normalizeText(produto)
    .toUpperCase()
    .replace(/[^A-Z0-9À-Ú\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4 && !['COMERCIAL', 'EXTRA', 'CURTO', 'CURTA', 'CM', 'MM', 'COM'].includes(word));
  return words[0] || '';
}

function pluralizeCategorySeed(seed) {
  if (!seed) return '';
  if (seed.endsWith('S')) return seed;
  if (seed.endsWith('L')) return seed.slice(0, -1) + 'IS';
  return seed + 'S';
}

function autoCategorizeRecords(records, defaultCategoria, defaultSubcategoria) {
  const seedCounts = new Map();
  records.forEach(record => {
    if (record.categoriaSource === 'report') return;
    const known = inferKnownCategory(record.produto);
    if (known) return;
    const seed = getCategorySeed(record.produto);
    if (seed) seedCounts.set(seed, (seedCounts.get(seed) || 0) + 1);
  });

  return records.map(record => {
    if (record.categoriaSource === 'report') return record;
    const known = inferKnownCategory(record.produto);
    if (known) return { ...record, categoria: rememberCategory(known), subcategoria: normalizeSubcategory(record.subcategoria, known, ''), categoriaSource: 'inferred' };

    const seed = getCategorySeed(record.produto);
    const created = seed && seedCounts.get(seed) >= 2 ? pluralizeCategorySeed(seed) : '';
    const categoria = rememberCategory(created || defaultCategoria || 'OUTROS');
    const subcategoria = categoria === defaultCategoria ? defaultSubcategoria : '';
    return { ...record, categoria, subcategoria, categoriaSource: created ? 'inferred' : 'default' };
  });
}

function normalizeSubcategory(value, categoria, fallback = '') {
  const opts = SUBCATS[categoria] || [''];
  const key = normalizeKey(value);
  const found = opts.find(opt => normalizeKey(opt) === key);
  return found || fallback || '';
}

function findHeaderMap(rows) {
  let best = null;
  rows.slice(0, 25).forEach((row, rowIndex) => {
    const map = {};
    row.forEach((cell, colIndex) => {
      const key = normalizeKey(cell);
      if (!key) return;
      if (['codigo', 'cod', 'codproduto', 'codigoproduto', 'referencia', 'ref'].includes(key)) map.codigo = colIndex;
      if (['produto', 'descricao', 'descricaoproduto', 'item', 'nome', 'material'].includes(key)) map.produto = colIndex;
      if (['valor', 'preco', 'precovenda', 'precoavista', 'vlr', 'valorunitario', 'preco unitario'.replace(/ /g, '')].includes(key)) map.valor = colIndex;
      if (['categoria', 'grupo', 'familia', 'linha'].includes(key)) map.categoria = colIndex;
      if (['subcategoria', 'subgrupo', 'sub', 'marca'].includes(key)) map.subcategoria = colIndex;
    });
    const score = Number.isInteger(map.codigo) + Number.isInteger(map.produto) + Number.isInteger(map.valor) * 2;
    if (score >= 3 && (!best || score > best.score)) best = { rowIndex, map, score };
  });
  return best;
}

function extractRecordFromLine(text, sourceRow, defaultCategoria, defaultSubcategoria) {
  const line = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!line) return null;
  const priceMatches = [...line.matchAll(/(?:R\$\s*)?-?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?-?\d+,\d{2}|(?:R\$\s*)?-?\d+\.\d{2}/g)];
  if (priceMatches.length === 0) return null;
  const priceMatch = priceMatches[priceMatches.length - 1];
  const valor = parseBRNumber(priceMatch[0]);
  if (!Number.isFinite(valor)) return null;

  const beforePrice = line.slice(0, priceMatch.index).trim();
  const codeMatch = beforePrice.match(/^\D*(\d{2,10})\b/) || beforePrice.match(/\b(\d{2,10})\b/);
  if (!codeMatch) return null;

  const codigo = codeMatch[1];
  const productStart = (codeMatch.index || 0) + codeMatch[0].length;
  const produto = beforePrice
    .slice(productStart)
    .replace(/^[\s\-–—|;:]+/, '')
    .trim();

  if (!produto) return null;
  return { codigo, produto, valor, categoria: defaultCategoria, subcategoria: defaultSubcategoria, sourceRow };
}

function recordsFromRows(rows, defaultCategoria, defaultSubcategoria) {
  const header = findHeaderMap(rows);
  const records = [];

  if (header) {
    rows.slice(header.rowIndex + 1).forEach((row, idx) => {
      const codigo = String(row[header.map.codigo] ?? '').trim();
      const produto = String(row[header.map.produto] ?? '').trim();
      const valor = parseBRNumber(row[header.map.valor]);
      if (!codigo || !produto || !Number.isFinite(valor)) return;
      const categoriaRaw = Number.isInteger(header.map.categoria) ? row[header.map.categoria] : '';
      const hasReportCategory = !!String(categoriaRaw ?? '').trim();
      const categoria = normalizeCategory(categoriaRaw, defaultCategoria);
      const subRaw = Number.isInteger(header.map.subcategoria) ? row[header.map.subcategoria] : '';
      const subcategoria = normalizeSubcategory(subRaw, categoria, defaultSubcategoria);
      records.push({
        codigo,
        produto,
        valor,
        categoria,
        subcategoria,
        categoriaSource: hasReportCategory ? 'report' : 'auto',
        sourceRow: header.rowIndex + idx + 2,
      });
    });
  }

  if (records.length > 0) return autoCategorizeRecords(records, defaultCategoria, defaultSubcategoria);

  rows.forEach((row, idx) => {
    const record = extractRecordFromLine(row.join(' '), idx + 1, defaultCategoria, defaultSubcategoria);
    if (record) records.push(record);
  });
  return autoCategorizeRecords(records, defaultCategoria, defaultSubcategoria);
}

async function parseExcelReport(file, defaultCategoria, defaultSubcategoria) {
  if (!window.XLSX) throw new Error('Biblioteca de Excel não carregou. Verifique a internet e recarregue a página.');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const rows = workbook.SheetNames.flatMap(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  });
  return recordsFromRows(rows, defaultCategoria, defaultSubcategoria);
}

async function parseDelimitedReport(file, defaultCategoria, defaultSubcategoria) {
  const text = await file.text();
  const separator = file.name.toLowerCase().endsWith('.tsv') ? '\t' : ';';
  const rows = text.split(/\r?\n/).map(line => {
    const parts = line.includes(separator) ? line.split(separator) : line.split(',');
    return parts.map(part => part.trim());
  });
  return recordsFromRows(rows, defaultCategoria, defaultSubcategoria);
}

async function parsePdfReport(file, defaultCategoria, defaultSubcategoria) {
  if (!window.pdfjsLib) throw new Error('Biblioteca de PDF não carregou. Verifique a internet e recarregue a página.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const rows = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = new Map();
    content.items.forEach(item => {
      const y = Math.round(item.transform[5] / 3) * 3;
      const x = item.transform[4];
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push({ x, text: item.str });
    });
    [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const line = items.sort((a, b) => a.x - b.x).map(item => item.text).join(' ').trim();
        if (line) rows.push([line]);
      });
  }

  return recordsFromRows(rows, defaultCategoria, defaultSubcategoria);
}

function buildImportPlan(records) {
  const current = getProdutos();
  const byCode = new Map(current.map((p, index) => [String(p.codigo).trim(), { product: p, index }]));
  const seen = new Set();
  const changes = [];

  records.forEach(record => {
    const codigo = String(record.codigo).trim();
    if (!codigo || seen.has(codigo)) return;
    seen.add(codigo);
    const found = byCode.get(codigo);
    if (found) {
      const shouldUpdateCategory = ['report', 'inferred'].includes(record.categoriaSource);
      changes.push({
        type: 'update',
        index: found.index,
        before: found.product,
        after: {
          ...found.product,
          valor: record.valor,
          categoria: shouldUpdateCategory ? record.categoria : found.product.categoria,
          subcategoria: shouldUpdateCategory ? record.subcategoria : found.product.subcategoria,
        },
        record,
      });
    } else {
      changes.push({
        type: 'new',
        after: {
          id: 'p_imp_' + Date.now() + '_' + changes.length,
          codigo,
          produto: record.produto,
          valor: record.valor,
          categoria: record.categoria,
          subcategoria: record.subcategoria,
        },
        record,
      });
    }
  });

  return { records, changes };
}

function clearImportPreview() {
  importPlan = null;
  const preview = document.getElementById('importPreview');
  if (preview) {
    preview.hidden = true;
    preview.innerHTML = '';
  }
  const input = document.getElementById('reportFile');
  if (input) input.value = '';
}

function renderImportPreview(plan, fileName) {
  const preview = document.getElementById('importPreview');
  const updates = plan.changes.filter(c => c.type === 'update');
  const news = plan.changes.filter(c => c.type === 'new');
  const ignored = Math.max(0, plan.records.length - plan.changes.length);
  const sample = plan.changes.slice(0, 12);

  preview.hidden = false;
  preview.innerHTML = `
    <div class="import-summary">
      <div class="import-summary-item"><strong>${plan.records.length}</strong><span>Lidos</span></div>
      <div class="import-summary-item"><strong>${updates.length}</strong><span>Atualizar</span></div>
      <div class="import-summary-item"><strong>${news.length}</strong><span>Cadastrar</span></div>
      <div class="import-summary-item"><strong>${ignored}</strong><span>Ignorados</span></div>
    </div>
    <div class="import-preview-body">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Código</th>
            <th>Produto</th>
            <th style="text-align:right">Valor</th>
            <th>Categoria</th>
          </tr>
        </thead>
        <tbody>
          ${sample.map(change => `
            <tr>
              <td><span class="import-status import-status--${change.type}">${change.type === 'update' ? 'Atualizar' : 'Novo'}</span></td>
              <td class="td-code">${escapeHTML(change.after.codigo)}</td>
              <td class="td-name">${escapeHTML(change.after.produto)}</td>
              <td class="td-price">${formatBRL(change.after.valor)}</td>
              <td>${escapeHTML(change.after.categoria)}${change.after.subcategoria ? ' › ' + escapeHTML(change.after.subcategoria) : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="import-preview-actions">
      <button class="btn btn-secondary" onclick="clearImportPreview()">Cancelar</button>
      <button class="btn btn-success" onclick="applyImportReport()">Aplicar ${plan.changes.length} alterações</button>
    </div>
  `;

  toast(`Prévia pronta: ${fileName}`);
}

async function importReport() {
  const input = document.getElementById('reportFile');
  const file = input.files && input.files[0];
  if (!file) {
    toast('Selecione um arquivo PDF ou Excel.', true);
    return;
  }

  const defaultCategoria = document.getElementById('importDefaultCat').value || 'RIPADOS';
  const defaultSubcategoria = document.getElementById('importDefaultSubcat').value || '';
  const name = file.name.toLowerCase();

  try {
    toast('Lendo relatório...');
    let records;
    if (name.endsWith('.pdf')) records = await parsePdfReport(file, defaultCategoria, defaultSubcategoria);
    else if (name.endsWith('.xlsx') || name.endsWith('.xls')) records = await parseExcelReport(file, defaultCategoria, defaultSubcategoria);
    else if (name.endsWith('.csv') || name.endsWith('.tsv')) records = await parseDelimitedReport(file, defaultCategoria, defaultSubcategoria);
    else throw new Error('Formato não suportado. Use PDF, Excel, CSV ou TSV.');

    if (records.length === 0) {
      clearImportPreview();
      toast('Não encontrei produtos válidos no relatório.', true);
      return;
    }

    importPlan = buildImportPlan(records);
    if (importPlan.changes.length === 0) {
      clearImportPreview();
      toast('Nada para atualizar ou cadastrar.', true);
      return;
    }
    renderImportPreview(importPlan, file.name);
  } catch (err) {
    console.error(err);
    toast('Erro ao importar: ' + err.message, true);
  }
}

function applyImportReport() {
  if (!importPlan || importPlan.changes.length === 0) {
    toast('Nenhuma prévia para aplicar.', true);
    return;
  }

  const lista = getProdutos();
  let updated = 0;
  let created = 0;

  importPlan.changes.forEach(change => {
    if (change.type === 'update' && lista[change.index]) {
      lista[change.index] = change.after;
      updated += 1;
    }
    if (change.type === 'new') {
      lista.push(change.after);
      created += 1;
    }
  });

  setProdutos(lista);
  refreshCategoryList();
  populateAllCategorySelects();
  renderAdminTable();
  clearImportPreview();
  toast(`Importação aplicada: ${updated} atualizados, ${created} cadastrados.`);
}

// ── Reset to initial data ─────────────────────────────────────────────
function resetData() {
  if (!confirm('Restaurar dados originais? Alterações serão perdidas.')) return;
  localStorage.removeItem('produtos');
  getProdutos(); // re-seeds from PRODUTOS_INICIAIS
  refreshCategoryList();
  populateAllCategorySelects();
  renderAdminTable();
  toast('Dados restaurados!');
}

// ── Admin sort ────────────────────────────────────────────────────────
function onAdminSort(col) {
  if (adminSortCol === col) adminSortDir *= -1;
  else { adminSortCol = col; adminSortDir = 1; }
  renderAdminTable();
}

// ── Ensure all products have IDs ──────────────────────────────────────
function ensureIds() {
  const lista = getProdutos();
  let changed = false;
  lista.forEach((p, i) => {
    if (!p.id) { p.id = 'p_' + i + '_' + Date.now(); changed = true; }
  });
  if (changed) setProdutos(lista);
}

// ── GitHub: Config ────────────────────────────────────────────────────
function loadGHConfig() {
  const raw = localStorage.getItem('gh_config');
  return raw ? JSON.parse(raw) : { owner: '', repo: '', branch: 'main', token: '' };
}

function saveGHConfig() {
  const cfg = {
    owner:  document.getElementById('ghOwner').value.trim(),
    repo:   document.getElementById('ghRepo').value.trim(),
    branch: document.getElementById('ghBranch').value.trim() || 'main',
    token:  document.getElementById('ghToken').value.trim(),
  };
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    toast('Preencha usuário, repositório e token.', true);
    return;
  }
  localStorage.setItem('gh_config', JSON.stringify(cfg));
  updateGHStatus(true);
  toast('Configuração salva!');
}

function clearGHConfig() {
  if (!confirm('Remover configuração do GitHub?')) return;
  localStorage.removeItem('gh_config');
  document.getElementById('ghOwner').value = '';
  document.getElementById('ghRepo').value = '';
  document.getElementById('ghBranch').value = '';
  document.getElementById('ghToken').value = '';
  updateGHStatus(false);
  toast('Configuração removida.');
}

function updateGHStatus(configured) {
  const el = document.getElementById('ghStatus');
  if (configured) {
    el.textContent = 'Configurado';
    el.className = 'gh-status gh-status--ok';
  } else {
    el.textContent = 'Não configurado';
    el.className = 'gh-status gh-status--unconfigured';
  }
}

function toggleGHCard() {
  const body    = document.getElementById('ghBody');
  const chevron = document.getElementById('ghChevron');
  const open    = body.classList.toggle('open');
  chevron.classList.toggle('open', open);
}

function initGHCard() {
  const cfg = loadGHConfig();
  const configured = !!(cfg.owner && cfg.repo && cfg.token);
  if (configured) {
    document.getElementById('ghOwner').value  = cfg.owner;
    document.getElementById('ghRepo').value   = cfg.repo;
    document.getElementById('ghBranch').value = cfg.branch || 'main';
    document.getElementById('ghToken').value  = cfg.token;
  }
  updateGHStatus(configured);
  // Abre o card automaticamente se ainda não configurado
  if (!configured) toggleGHCard();
}

// ── GitHub: Encode UTF-8 → Base64 ─────────────────────────────────────
function toBase64UTF8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

// ── GitHub: Gerar conteúdo do produtos.js ─────────────────────────────
function generateProdutosJS(versao) {
  const lista = getProdutos();
  const json  = JSON.stringify(lista, null, 2);
  return `// Incrementado automaticamente a cada publicação via Admin → GitHub
const PRODUTOS_VERSAO = ${versao};

const PRODUTOS_INICIAIS = ${json};

function getProdutos() {
  const savedVersao = localStorage.getItem('produtos_versao');
  const saved = localStorage.getItem('produtos');
  if (PRODUTOS_VERSAO > 0 && String(savedVersao) !== String(PRODUTOS_VERSAO)) {
    localStorage.setItem('produtos', JSON.stringify(PRODUTOS_INICIAIS));
    localStorage.setItem('produtos_versao', String(PRODUTOS_VERSAO));
    return PRODUTOS_INICIAIS;
  }
  if (saved) return JSON.parse(saved);
  localStorage.setItem('produtos', JSON.stringify(PRODUTOS_INICIAIS));
  localStorage.setItem('produtos_versao', String(PRODUTOS_VERSAO));
  return PRODUTOS_INICIAIS;
}

function setProdutos(lista) {
  localStorage.setItem('produtos', JSON.stringify(lista));
}
`;
}

// ── GitHub: Buscar SHA do arquivo atual ───────────────────────────────
async function getFileSHA(cfg) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/produtos.js?ref=${cfg.branch}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return null; // arquivo ainda não existe
  if (!res.ok) throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.sha;
}

// ── GitHub: Publicar ──────────────────────────────────────────────────
async function publishToGitHub() {
  const cfg = loadGHConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    toast('Configure o GitHub primeiro (painel acima).', true);
    if (!document.getElementById('ghBody').classList.contains('open')) toggleGHCard();
    return;
  }

  const btn = document.getElementById('btnPublish');
  btn.disabled = true;
  btn.textContent = '⏳ Publicando…';

  try {
    const versao  = Date.now();
    const content = generateProdutosJS(versao);
    const encoded = toBase64UTF8(content);
    const sha     = await getFileSHA(cfg);

    const body = {
      message: `chore: atualiza produtos.js [${new Date().toLocaleString('pt-BR')}]`,
      content: encoded,
      branch:  cfg.branch,
    };
    if (sha) body.sha = sha;

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/produtos.js`;
    const res = await fetch(url, {
      method:  'PUT',
      headers: {
        Authorization:  `Bearer ${cfg.token}`,
        Accept:         'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `${res.status} ${res.statusText}`);
    }

    // Marca versão no localStorage para que o admin não perca os dados
    localStorage.setItem('produtos_versao', String(versao));

    const ghStatus = document.getElementById('ghStatus');
    ghStatus.textContent = 'Publicado ✓';
    ghStatus.className = 'gh-status gh-status--ok';
    toast(`✅ Publicado! GitHub Pages atualiza em ~1 min.`);

  } catch (err) {
    const ghStatus = document.getElementById('ghStatus');
    ghStatus.textContent = 'Erro';
    ghStatus.className = 'gh-status gh-status--error';
    toast('Erro: ' + err.message, true);
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Publicar';
  }
}

// ── Init ──────────────────────────────────────────────────────────────
ensureIds();
initGHCard();
refreshCategoryList();
populateAllCategorySelects('RIPADOS');
updateSubcatOptions();
renderAdminTable();

document.getElementById('adminSearch').addEventListener('input', e => {
  adminQuery = e.target.value;
  renderAdminTable();
});

document.getElementById('filterCat').addEventListener('change', renderAdminTable);
document.getElementById('fCategoria').addEventListener('change', updateSubcatOptions);
document.getElementById('importDefaultCat').addEventListener('change', updateImportSubcatOptions);
