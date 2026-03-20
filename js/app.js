/* ─────────────────────────────────────────
   AI Timeline — Main App Logic
   ───────────────────────────────────────── */

const TYPE_META = {
  company:   { label: '公司',   emoji: '🏢', color: '#6366f1' },
  model:     { label: '模型',   emoji: '🤖', color: '#8b5cf6' },
  product:   { label: '产品',   emoji: '📦', color: '#06b6d4' },
  funding:   { label: '融资',   emoji: '💰', color: '#f59e0b' },
  research:  { label: '研究',   emoji: '📄', color: '#10b981' },
  event:     { label: '里程碑', emoji: '⭐', color: '#f43f5e' },
  personnel: { label: '人事',   emoji: '👤', color: '#94a3b8' },
};

let allCompanies = [];
let allEvents    = [];
let state = {
  selectedCompanies: new Set(),
  selectedTypes:     new Set(['all']),
  searchQuery:       '',
  openEventId:       null,
};

/* ─── Data Loading ─────────────────────── */

async function parseJSONL(text) {
  return text.trim().split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

async function loadData() {
  try {
    const [cRes, eRes] = await Promise.all([
      fetch('./data/companies.jsonl'),
      fetch('./data/events.jsonl'),
    ]);
    allCompanies = await parseJSONL(await cRes.text());
    allEvents    = await parseJSONL(await eRes.text());
    // Default: all companies selected
    state.selectedCompanies = new Set(allCompanies.map(c => c.id));
    return true;
  } catch (err) {
    console.error('Failed to load data:', err);
    return false;
  }
}

/* ─── Helpers ──────────────────────────── */

function getCompany(id) {
  return allCompanies.find(c => c.id === id) || null;
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['','01','02','03','04','05','06','07','08','09','10','11','12'];
  return `${y}-${m}-${day || ''}`.replace(/-$/, '');
}

function filteredEvents() {
  const q = state.searchQuery.toLowerCase().trim();
  return allEvents.filter(evt => {
    if (!state.selectedCompanies.has(evt.company_id)) return false;
    if (!state.selectedTypes.has('all') && !state.selectedTypes.has(evt.type)) return false;
    if (q) {
      const haystack = [evt.title, evt.summary, evt.title_en, (evt.people || []).join(' ')]
        .join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function highlight(text, q) {
  if (!q) return escapeHTML(text);
  const escaped = escapeHTML(text);
  const re = new RegExp(`(${escapeRE(q)})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function escapeHTML(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeRE(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ─── Sidebar ──────────────────────────── */

function renderSidebar() {
  const container = document.getElementById('company-list');
  const eventsByCompany = {};
  filteredEvents().forEach(e => {
    eventsByCompany[e.company_id] = (eventsByCompany[e.company_id] || 0) + 1;
  });
  // total (unfiltered by company) count
  const allFiltered = allEvents.filter(e => {
    if (!state.selectedTypes.has('all') && !state.selectedTypes.has(e.type)) return false;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const h = [e.title, e.summary, e.title_en].join(' ').toLowerCase();
      if (!h.includes(q)) return false;
    }
    return true;
  });
  const totalByCompany = {};
  allFiltered.forEach(e => {
    totalByCompany[e.company_id] = (totalByCompany[e.company_id] || 0) + 1;
  });

  container.innerHTML = allCompanies.map(c => {
    const active = state.selectedCompanies.has(c.id);
    const cnt = totalByCompany[c.id] || 0;
    if (cnt === 0) return '';
    return `
      <div class="company-item ${active ? 'active' : ''}"
           style="--company-color:${c.color}"
           data-id="${c.id}">
        <div class="company-dot" style="background:${c.color}"></div>
        <div class="company-checkbox"></div>
        <span class="company-name">${escapeHTML(c.name)}</span>
        <span class="company-count">${cnt}</span>
      </div>`;
  }).join('');

  container.querySelectorAll('.company-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (state.selectedCompanies.has(id)) {
        if (state.selectedCompanies.size > 1) state.selectedCompanies.delete(id);
      } else {
        state.selectedCompanies.add(id);
      }
      render();
    });
  });

  // Legend
  const legend = document.getElementById('sidebar-legend');
  if (legend) {
    legend.innerHTML = `
      <div class="legend-title">图例</div>
      <div class="legend-grid">
        ${Object.entries(TYPE_META).map(([, m]) =>
          `<div class="legend-item">
            <span class="legend-emoji">${m.emoji}</span>
            <span>${m.label}</span>
          </div>`
        ).join('')}
      </div>`;
  }
}

/* ─── Type Filter Chips ─────────────────── */

function renderTypeChips() {
  const container = document.getElementById('type-filter-bar');
  const types = ['all', ...Object.keys(TYPE_META)];
  container.innerHTML = types.map(t => {
    const active = state.selectedTypes.has(t);
    const meta = t === 'all' ? { label: '全部', emoji: '' } : TYPE_META[t];
    return `<button class="type-chip ${active ? 'active' : ''}" data-type="${t}">
      ${meta.emoji ? meta.emoji + ' ' : ''}${meta.label}
    </button>`;
  }).join('');

  container.querySelectorAll('.type-chip').forEach(el => {
    el.addEventListener('click', () => {
      const t = el.dataset.type;
      if (t === 'all') {
        state.selectedTypes = new Set(['all']);
      } else {
        state.selectedTypes.delete('all');
        if (state.selectedTypes.has(t)) {
          state.selectedTypes.delete(t);
          if (state.selectedTypes.size === 0) state.selectedTypes.add('all');
        } else {
          state.selectedTypes.add(t);
        }
      }
      render();
    });
  });
}

/* ─── Timeline ──────────────────────────── */

function renderTimeline() {
  const container = document.getElementById('timeline');
  const events = filteredEvents();
  const q = state.searchQuery;

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <h3>未找到相关事件</h3>
        <p>尝试调整筛选条件或搜索关键词</p>
      </div>`;
    return;
  }

  // Group by year, sort desc
  const byYear = {};
  events.forEach(e => {
    const yr = e.year || parseInt(e.date?.slice(0,4));
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(e);
  });
  const years = Object.keys(byYear).map(Number).sort((a,b) => b - a);

  container.innerHTML = `<div class="timeline-track">${
    years.map(yr => {
      const evts = byYear[yr].sort((a,b) => (a.date||'') < (b.date||'') ? 1 : -1);
      return `
        <div class="tl-year">
          <div class="tl-year-head">
            <div class="tl-year-gutter"><span class="tl-yr-node"></span></div>
            <div class="tl-year-bar">
              <div class="tl-hr"></div>
              <span class="tl-yr-lbl">${yr}</span>
              <div class="tl-hr"></div>
              <span class="tl-yr-cnt">${evts.length} 个事件</span>
            </div>
          </div>
          ${evts.map(e => renderEventNode(e, q)).join('')}
        </div>`;
    }).join('')
  }</div>`;

  container.querySelectorAll('.tl-event').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}

function renderEventNode(evt, q) {
  const co = getCompany(evt.company_id);
  const color = co?.color || '#6366f1';
  const meta = TYPE_META[evt.type] || TYPE_META.event;
  const imp = evt.importance || 3;
  const stars = '★'.repeat(imp) + '☆'.repeat(5 - imp);

  const people = evt.people?.length
    ? `<span class="tl-sep">·</span><span class="tl-people">${escapeHTML(evt.people.slice(0,2).join('、'))}</span>`
    : '';

  return `
    <div class="tl-event" data-id="${evt.id}" style="--co:${color}">
      <div class="tl-event-gutter">
        <div class="tl-dot"></div>
      </div>
      <div class="tl-connector"></div>
      <div class="tl-card">
        <div class="tl-card-top">
          <span class="tl-type-emoji">${meta.emoji}</span>
          <span class="tl-title">${highlight(evt.title, q)}</span>
          <span class="tl-stars">${stars}</span>
        </div>
        <div class="tl-meta">
          <span class="tl-date">${evt.date || evt.year}</span>
          <span class="tl-sep">·</span>
          <span class="tl-company-name" style="color:${color}">${escapeHTML(co?.name || evt.company_id)}</span>
          ${people}
        </div>
        ${evt.summary ? `<div class="tl-summ">${highlight(evt.summary, q)}</div>` : ''}
      </div>
    </div>`;
}

/* ─── Stats ─────────────────────────────── */

function renderStats() {
  const el = document.getElementById('header-stat');
  const n = filteredEvents().length;
  el.innerHTML = `显示 <b>${n}</b> 个事件`;
}

/* ─── Modal ─────────────────────────────── */

function openModal(eventId) {
  const evt = allEvents.find(e => e.id === eventId);
  if (!evt) return;
  state.openEventId = eventId;

  const co = getCompany(evt.company_id);
  const color = co?.color || '#6366f1';
  const meta = TYPE_META[evt.type] || TYPE_META.event;
  const imp = evt.importance || 3;

  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-header" style="border-left: 3px solid ${color}; padding-left: 17px;">
      <button class="modal-close" id="modal-close">✕</button>
      <div class="modal-type-row">
        <span class="modal-type-badge" style="background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}44">
          ${meta.emoji} ${meta.label}
        </span>
        <span class="modal-date-badge">${evt.date || evt.year}</span>
        ${evt.verified ? '<span class="verified-badge">✓ 已核实</span>' : ''}
      </div>
      <div class="modal-title">${escapeHTML(evt.title)}</div>
      ${evt.title_en ? `<div style="font-size:.78rem;color:var(--text-dim);margin-top:4px">${escapeHTML(evt.title_en)}</div>` : ''}
    </div>
    <div class="modal-body">
      ${co ? `
        <div class="modal-company-row">
          <div class="modal-company-dot" style="background:${color}"></div>
          <span class="modal-company-name">${escapeHTML(co.name)}</span>
          ${co.name_zh ? `<span style="font-size:.78rem;color:var(--text-muted)">${escapeHTML(co.name_zh)}</span>` : ''}
          <span class="modal-company-country">${escapeHTML(co.country || '')}</span>
        </div>` : ''}

      <div class="modal-importance" style="margin-bottom:14px">
        <span class="modal-importance-label">重要程度：</span>
        <div class="modal-importance-stars">
          ${Array.from({length:5},(_,i)=>`<span class="modal-importance-star">${i<imp?'★':'☆'}</span>`).join('')}
        </div>
      </div>

      <p class="modal-summary">${escapeHTML(evt.summary || '')}</p>

      ${evt.detail ? `
        <div class="modal-detail" style="display:block">${escapeHTML(evt.detail)}</div>` : ''}

      ${evt.people?.length ? `
        <div class="modal-section-title">关键人物</div>
        <div class="modal-people">
          ${evt.people.map(p=>`<span class="person-chip">👤 ${escapeHTML(p)}</span>`).join('')}
        </div>` : ''}

      ${evt.model_params ? renderModelParams(evt.model_params) : ''}

      ${evt.source_url ? `
        <div class="modal-section-title">信息来源</div>
        <a class="modal-source-link" href="${escapeHTML(evt.source_url)}" target="_blank" rel="noopener">
          🔗 查看原始资料
        </a>` : ''}
    </div>`;

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-close').addEventListener('click', closeModal);
}

function renderModelParams(params) {
  const rows = [];
  if (params.parameters) rows.push(['参数量', params.parameters]);
  if (params.context_window) rows.push(['上下文窗口', Number(params.context_window).toLocaleString() + ' tokens']);
  if (params.modality) rows.push(['模态', params.modality.join(' / ')]);
  if (!rows.length) return '';
  return `
    <div class="modal-section-title" style="margin-top:16px">模型参数</div>
    <div class="modal-params">
      ${rows.map(([k,v])=>`
        <div class="param-row">
          <span class="param-key">${k}</span>
          <span class="param-val">${escapeHTML(String(v))}</span>
        </div>`).join('')}
    </div>`;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  state.openEventId = null;
}

/* ─── Select All / None ─────────────────── */

function setupSelectAll() {
  document.getElementById('select-all-btn').addEventListener('click', () => {
    if (state.selectedCompanies.size === allCompanies.length) {
      // select none -> keep at least 1
      state.selectedCompanies = new Set([allCompanies[0]?.id]);
    } else {
      state.selectedCompanies = new Set(allCompanies.map(c => c.id));
    }
    render();
  });
}

/* ─── Search ─────────────────────────────── */

function setupSearch() {
  const input = document.getElementById('search');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.searchQuery = input.value;
      render();
    }, 200);
  });
}

/* ─── Modal overlay click ─────────────────── */
function setupModalOverlay() {
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ─── Mobile sidebar ─────────────────────── */
function setupMobileSidebar() {
  const btn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });
  document.addEventListener('click', e => {
    if (sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) && e.target !== btn) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

/* ─── Main Render ───────────────────────── */

function render() {
  renderSidebar();
  renderTypeChips();
  renderTimeline();
  renderStats();
  // Update select-all button text
  const btn = document.getElementById('select-all-btn');
  btn.textContent = state.selectedCompanies.size === allCompanies.length
    ? '取消全选' : '全部选中';
}

/* ─── Boot ───────────────────────────────── */

async function boot() {
  const ok = await loadData();
  document.getElementById('loading').style.display = 'none';
  if (!ok) {
    document.getElementById('timeline').innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <h3>数据加载失败</h3>
        <p>请通过本地服务器访问（运行 start.bat），不能直接用浏览器打开文件</p>
      </div>`;
    return;
  }
  setupSearch();
  setupModalOverlay();
  setupSelectAll();
  setupMobileSidebar();
  render();
}

document.addEventListener('DOMContentLoaded', boot);
