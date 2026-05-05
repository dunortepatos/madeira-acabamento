// ── State ──────────────────────────────────────────────────────────────
let editingId = null;
let adminSortCol = 'produto';
let adminSortDir = 1;
let adminQuery = '';

const CATEGORIAS_LIST = ['RIPADOS','ASSOALHOS','DECKS','LAMBRIL','FECHADURAS','PUXADORES','PORTAS','PORTAIS','ALISARES'];
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

// ── Subcategory options ────────────────────────────────────────────────
function updateSubcatOptions() {
  const cat = document.getElementById('fCategoria').value;
  const sel = document.getElementById('fSubcategoria');
  const opts = SUBCATS[cat] || [''];
  sel.innerHTML = opts.map(s => `<option value="${s}">${s || '(nenhuma)'}</option>`).join('');
}

// ── Populate category selects ──────────────────────────────────────────
function populateCatSelect(id) {
  const sel = document.getElementById(id);
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas</option>' +
    CATEGORIAS_LIST.map(c => `<option value="${c}">${c}</option>`).join('');
  if (cur) sel.value = cur;
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
    <tr data-id="${p.id}">
      <td class="td-code">${p.codigo}</td>
      <td class="td-name">${p.produto}</td>
      <td class="td-price">${formatBRL(p.valor)}</td>
      <td style="color:var(--text-muted);font-size:.8rem">${p.categoria}${p.subcategoria ? ' › '+p.subcategoria : ''}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-secondary btn-sm" onclick="editProd('${p.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProd('${p.id}')">🗑️</button>
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
  const categoria = document.getElementById('fCategoria').value;
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
        setProdutos(data);
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

// ── Reset to initial data ─────────────────────────────────────────────
function resetData() {
  if (!confirm('Restaurar dados originais? Alterações serão perdidas.')) return;
  localStorage.removeItem('produtos');
  getProdutos(); // re-seeds from PRODUTOS_INICIAIS
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
populateCatSelect('filterCat');
updateSubcatOptions();
renderAdminTable();

document.getElementById('adminSearch').addEventListener('input', e => {
  adminQuery = e.target.value;
  renderAdminTable();
});

document.getElementById('filterCat').addEventListener('change', renderAdminTable);
document.getElementById('fCategoria').addEventListener('change', updateSubcatOptions);
