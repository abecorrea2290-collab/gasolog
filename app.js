'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
const DB = {
  get: () => JSON.parse(localStorage.getItem('gasolog_records') || '[]'),
  set: (data) => localStorage.setItem('gasolog_records', JSON.stringify(data)),
  getConfig: () => JSON.parse(localStorage.getItem('gasolog_config') || '{}'),
  setConfig: (c) => localStorage.setItem('gasolog_config', JSON.stringify(c)),
};

const DEFAULT_CONFIG = {
  currency: 'COP',
  distanceUnit: 'km',
  fuelUnit: 'L',
  tankCapacity: 50,
  vehicle: 'Mi Vehículo',
  avgDailyKm: 40,
};

let config = { ...DEFAULT_CONFIG, ...DB.getConfig() };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = {
  num: (n, d = 1) => isFinite(n) ? n.toFixed(d) : '—',
  currency: (n) => isFinite(n)
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: config.currency, maximumFractionDigits: 0 }).format(n)
    : '—',
  date: (iso) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
  relDate: (iso) => {
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Ayer';
    return `Hace ${d} días`;
  },
};

function litersToGallons(l) { return l / 3.785411784; }
function gallonsToLiters(g) { return g * 3.785411784; }

function calcEfficiency(km, liters) {
  if (!km || !liters) return null;
  const kmL = km / liters;
  const galKm = 1 / (kmL * 3.785411784);  // gal/km
  const mpg = kmL * 0.621371 / 0.264172;   // approx mpg
  return { kmL, galKm, mpg };
}

function efficiencyRating(kmL) {
  if (kmL >= 14) return { badge: 'badge-green', label: 'Excelente' };
  if (kmL >= 10) return { badge: 'badge-yellow', label: 'Normal' };
  return { badge: 'badge-red', label: 'Bajo' };
}

// ── Navigation ────────────────────────────────────────────────────────────────
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');

function showView(id) {
  views.forEach(v => v.classList.toggle('active', v.id === id));
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === id));
  if (id === 'dashboard') renderDashboard();
  if (id === 'history') renderHistory();
  if (id === 'stats') renderStats();
}

navBtns.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ── Record form ───────────────────────────────────────────────────────────────
const formEl = document.getElementById('recordForm');
const fuelUnitLabels = document.querySelectorAll('.fuel-unit-label');
const fuelUnitSuffix = document.querySelectorAll('.fuel-unit-suffix');

function updateUnitLabels() {
  const u = config.fuelUnit;
  document.querySelectorAll('.fuel-unit-label').forEach(el => el.textContent = u);
  document.querySelectorAll('.dist-unit-label').forEach(el => el.textContent = config.distanceUnit);
}

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const records = DB.get();

  const odometer = parseFloat(document.getElementById('fOdometer').value);
  const liters = parseFloat(document.getElementById('fLiters').value);
  const pricePerUnit = parseFloat(document.getElementById('fPrice').value);
  const notes = document.getElementById('fNotes').value.trim();

  if (isNaN(odometer) || isNaN(liters) || isNaN(pricePerUnit)) {
    toast('Por favor completa todos los campos requeridos', 'error');
    return;
  }

  // Validate odometer is greater than previous
  if (records.length > 0) {
    const last = records[records.length - 1];
    if (odometer <= last.odometer) {
      toast(`El odómetro debe ser mayor a ${last.odometer.toLocaleString()} ${config.distanceUnit}`, 'error');
      return;
    }
  }

  const litersActual = config.fuelUnit === 'gal' ? gallonsToLiters(liters) : liters;
  const totalCost = liters * pricePerUnit;

  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    odometer,
    liters: litersActual,
    litersInput: liters,
    fuelUnit: config.fuelUnit,
    pricePerUnit,
    totalCost,
    notes,
  };

  // Calculate efficiency vs previous record
  if (records.length > 0) {
    const prev = records[records.length - 1];
    const km = odometer - prev.odometer;
    record.kmDriven = km;
    const eff = calcEfficiency(km, litersActual);
    if (eff) {
      record.kmL = eff.kmL;
      record.galKm = eff.galKm;
      record.mpg = eff.mpg;
    }
  }

  records.push(record);
  DB.set(records);

  formEl.reset();
  closeModal('formModal');
  toast('¡Tanqueo registrado exitosamente!');
  showView('dashboard');
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const records = DB.get();
  const dashEl = document.getElementById('dashContent');

  if (records.length === 0) {
    dashEl.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M3 10h11M9 21V3m0 0L5 7m4-4 4 4M19.5 10a7.5 7.5 0 1 1-15 0"/>
        </svg>
        <p>Aún no hay registros.<br>Presiona <strong>+ Tanqueo</strong> para comenzar.</p>
      </div>`;
    return;
  }

  const last = records[records.length - 1];
  const prev = records.length >= 2 ? records[records.length - 2] : null;

  // Averages
  const withEff = records.filter(r => r.kmL);
  const avgKmL = withEff.length ? withEff.reduce((s, r) => s + r.kmL, 0) / withEff.length : null;
  const avgCost = records.reduce((s, r) => s + r.totalCost, 0) / records.length;

  // Estimated remaining range
  const kmDrivenSinceLast = last.kmDriven || null;
  const estimatedRange = avgKmL ? avgKmL * config.tankCapacity : null;
  const estimatedDays = estimatedRange ? Math.round(estimatedRange / config.avgDailyKm) : null;

  const rating = last.kmL ? efficiencyRating(last.kmL) : null;

  let heroContent = '';
  if (last.kmL) {
    const progPct = Math.min(100, (last.kmL / 20) * 100);
    heroContent = `
      <div class="big-stat">
        <div class="big-label">Último consumo</div>
        <div class="big-number">${fmt.num(last.kmL)}</div>
        <div class="big-unit">${config.distanceUnit} / Litro &nbsp;·&nbsp; <span class="badge ${rating.badge}">${rating.label}</span></div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>Eficiencia</span><span>${fmt.num(last.kmL)} km/L</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${progPct}%"></div></div>
      </div>`;
  } else {
    heroContent = `
      <div class="big-stat">
        <div class="big-label">Primer registro</div>
        <div class="big-number">${last.odometer.toLocaleString()}</div>
        <div class="big-unit">${config.distanceUnit} en odómetro</div>
      </div>
      <p style="font-size:.82rem;color:var(--text-muted);text-align:center;margin-top:.5rem">Registra el próximo tanqueo para ver tu consumo</p>`;
  }

  const gridCards = [
    { label: 'Costo último tanque', value: fmt.currency(last.totalCost), cls: '' },
    { label: 'Promedio km/L', value: avgKmL ? fmt.num(avgKmL) : '—', unit: 'km/L', cls: 'highlight' },
    { label: 'Rango estimado', value: estimatedRange ? Math.round(estimatedRange).toLocaleString() : '—', unit: config.distanceUnit, cls: 'success' },
    { label: 'Duración estimada', value: estimatedDays ? estimatedDays : '—', unit: estimatedDays ? 'días' : '', cls: 'warning' },
  ];

  const gridHtml = gridCards.map(c => `
    <div class="stat-card ${c.cls}">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}${c.unit ? ` <span class="stat-unit">${c.unit}</span>` : ''}</div>
    </div>`).join('');

  // Last record detail
  const lastDetail = `
    <div class="card">
      <div class="section-title">Último tanqueo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem">
        <div><span style="color:var(--text-muted)">Fecha</span><br><strong>${fmt.date(last.date)}</strong></div>
        <div><span style="color:var(--text-muted)">Odómetro</span><br><strong>${last.odometer.toLocaleString()} ${config.distanceUnit}</strong></div>
        <div><span style="color:var(--text-muted)">Combustible</span><br><strong>${fmt.num(last.litersInput, 2)} ${last.fuelUnit}</strong></div>
        <div><span style="color:var(--text-muted)">Precio / ${last.fuelUnit}</span><br><strong>${fmt.currency(last.pricePerUnit)}</strong></div>
        ${last.kmDriven ? `<div><span style="color:var(--text-muted)">Km recorridos</span><br><strong>${last.kmDriven.toLocaleString()} ${config.distanceUnit}</strong></div>` : ''}
        ${last.galKm ? `<div><span style="color:var(--text-muted)">Gal / km</span><br><strong>${fmt.num(last.galKm, 4)}</strong></div>` : ''}
        ${last.notes ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Notas</span><br><strong>${last.notes}</strong></div>` : ''}
      </div>
    </div>`;

  dashEl.innerHTML = `
    <div class="card card-hero">${heroContent}</div>
    <div class="card-grid">${gridHtml}</div>
    ${lastDetail}`;
}

// ── History ───────────────────────────────────────────────────────────────────
function renderHistory() {
  const records = DB.get();
  const el = document.getElementById('historyList');

  if (records.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
      </svg>
      <p>No hay registros aún.</p></div>`;
    return;
  }

  const reversed = [...records].reverse();
  el.innerHTML = reversed.map((r, i) => {
    const rating = r.kmL ? efficiencyRating(r.kmL) : null;
    return `
      <div class="history-item" data-id="${r.id}">
        <div class="history-icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 10h11M9 21V3m0 0L5 7m4-4 4 4"/>
          </svg>
        </div>
        <div class="history-info">
          <div class="history-date">${fmt.relDate(r.date)} · ${fmt.date(r.date)}</div>
          <div class="history-km">${r.odometer.toLocaleString()} ${config.distanceUnit}${r.kmDriven ? ` <span style="color:var(--text-dim);font-weight:400;font-size:.8rem">(+${r.kmDriven.toLocaleString()})</span>` : ''}</div>
          <div class="history-detail">${fmt.num(r.litersInput, 2)} ${r.fuelUnit} · ${fmt.currency(r.totalCost)}
            ${rating ? `· <span class="badge ${rating.badge}">${rating.label}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.25rem">
          ${r.kmL ? `<div class="history-efficiency">${fmt.num(r.kmL)}</div>
          <div class="history-cost">km/L</div>` : '<div class="history-cost" style="font-size:.75rem">Sin datos</div>'}
          <button class="delete-btn" onclick="deleteRecord(${r.id})" title="Eliminar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

window.deleteRecord = function(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  const records = DB.get().filter(r => r.id !== id);
  DB.set(records);
  renderHistory();
  toast('Registro eliminado');
};

// ── Stats ─────────────────────────────────────────────────────────────────────
function renderStats() {
  const records = DB.get();
  const el = document.getElementById('statsContent');

  if (records.length < 2) {
    el.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
      </svg>
      <p>Necesitas al menos 2 tanqueos<br>para ver estadísticas.</p></div>`;
    return;
  }

  const withEff = records.filter(r => r.kmL);
  const avgKmL = withEff.reduce((s, r) => s + r.kmL, 0) / withEff.length;
  const bestKmL = Math.max(...withEff.map(r => r.kmL));
  const worstKmL = Math.min(...withEff.map(r => r.kmL));
  const totalKm = records[records.length - 1].odometer - records[0].odometer;
  const totalLiters = records.slice(1).reduce((s, r) => s + r.liters, 0);
  const totalCost = records.reduce((s, r) => s + r.totalCost, 0);
  const avgCostTank = totalCost / records.length;
  const totalFillUps = records.length;

  // Cost per km
  const costPerKm = totalKm > 0 ? totalCost / totalKm : null;

  // Monthly cost estimate
  const monthlyEst = costPerKm ? costPerKm * config.avgDailyKm * 30 : null;

  const summaryCards = [
    { label: 'Promedio km/L', value: fmt.num(avgKmL), unit: 'km/L', cls: 'highlight' },
    { label: 'Mejor tanque', value: fmt.num(bestKmL), unit: 'km/L', cls: 'success' },
    { label: 'Peor tanque', value: fmt.num(worstKmL), unit: 'km/L', cls: 'warning' },
    { label: 'Total recorrido', value: totalKm.toLocaleString(), unit: config.distanceUnit, cls: '' },
    { label: 'Total combustible', value: fmt.num(totalLiters, 1), unit: 'L', cls: '' },
    { label: 'Total tanqueos', value: totalFillUps, unit: 'veces', cls: '' },
    { label: 'Gasto total', value: fmt.currency(totalCost), cls: '' },
    { label: 'Costo promedio/tanque', value: fmt.currency(avgCostTank), cls: '' },
    { label: 'Costo por km', value: costPerKm ? fmt.currency(costPerKm) : '—', cls: '' },
    { label: 'Gasto mensual est.', value: monthlyEst ? fmt.currency(monthlyEst) : '—', cls: 'warning' },
  ];

  // Chart: last 6 fill-ups efficiency
  const last6 = withEff.slice(-6);
  const maxKmL = Math.max(...last6.map(r => r.kmL));
  const chartBars = last6.map(r => {
    const pct = (r.kmL / maxKmL) * 100;
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">${fmt.date(r.date).split(' ').slice(0,2).join(' ')}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%">${fmt.num(r.kmL)} km/L</div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="card-grid">${summaryCards.map(c => `
      <div class="stat-card ${c.cls}">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}${c.unit ? ` <span class="stat-unit">${c.unit}</span>` : ''}</div>
      </div>`).join('')}
    </div>
    ${last6.length >= 2 ? `
    <div class="card">
      <div class="section-title">Eficiencia por tanqueo</div>
      <div class="chart-wrap">${chartBars}</div>
    </div>` : ''}`;
}

// ── Config ────────────────────────────────────────────────────────────────────
function loadConfig() {
  document.getElementById('cfgVehicle').value = config.vehicle;
  document.getElementById('cfgCurrency').value = config.currency;
  document.getElementById('cfgDistUnit').value = config.distanceUnit;
  document.getElementById('cfgFuelUnit').value = config.fuelUnit;
  document.getElementById('cfgTankCap').value = config.tankCapacity;
  document.getElementById('cfgDailyKm').value = config.avgDailyKm;
}

document.getElementById('saveConfig').addEventListener('click', () => {
  config.vehicle = document.getElementById('cfgVehicle').value;
  config.currency = document.getElementById('cfgCurrency').value;
  config.distanceUnit = document.getElementById('cfgDistUnit').value;
  config.fuelUnit = document.getElementById('cfgFuelUnit').value;
  config.tankCapacity = parseFloat(document.getElementById('cfgTankCap').value) || 50;
  config.avgDailyKm = parseFloat(document.getElementById('cfgDailyKm').value) || 40;
  DB.setConfig(config);
  updateUnitLabels();
  closeModal('configModal');
  toast('Configuración guardada');
  renderDashboard();
});

// ── Export CSV ────────────────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  const records = DB.get();
  if (!records.length) { toast('No hay datos para exportar', 'error'); return; }

  const headers = ['Fecha', 'Odómetro', 'Km Recorridos', 'Litros', 'Precio/Unidad', 'Total', 'km/L', 'Gal/km', 'Notas'];
  const rows = records.map(r => [
    fmt.date(r.date),
    r.odometer,
    r.kmDriven || '',
    fmt.num(r.liters, 2),
    r.pricePerUnit,
    r.totalCost.toFixed(0),
    r.kmL ? fmt.num(r.kmL) : '',
    r.galKm ? fmt.num(r.galKm, 4) : '',
    r.notes || '',
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'gasolog_registros.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Datos exportados');
});

// ── Clear data ────────────────────────────────────────────────────────────────
document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('¿Eliminar TODOS los registros? Esta acción no se puede deshacer.')) return;
  DB.set([]);
  renderHistory();
  renderDashboard();
  renderStats();
  toast('Datos eliminados');
});

// ── Auto-fill odometer hint ───────────────────────────────────────────────────
document.getElementById('fOdometer').addEventListener('focus', function() {
  if (!this.value) {
    const records = DB.get();
    if (records.length > 0) {
      const last = records[records.length - 1];
      this.placeholder = `Último: ${last.odometer.toLocaleString()} ${config.distanceUnit}`;
    }
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('vehicleName').textContent = config.vehicle;
updateUnitLabels();
loadConfig();
showView('dashboard');

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// PWA install prompt
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'flex';
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = 'none';
});
