// js/ui.js
import { state } from './state.js';
import { renderCharts } from './charts.js';

const views = document.querySelectorAll('.view');
const sidebarButtons = document.querySelectorAll('.nav-btn');
const mobileButtons = document.querySelectorAll('.mobile-btn');
const API_HOST = 'http://localhost:8080';

function buildImageUrl(imagePath) {
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;


  return `${API_HOST}/data/uploads/${imagePath.replace(/^\/+/, '')}`;
}

export function switchView(name) {
  views.forEach(v => {
    const match = v.classList.contains(`view-${name}`);
    v.classList.toggle('view-active', match);
  });

  sidebarButtons.forEach(btn => {
    const isActive = btn.dataset.view === name;
    btn.classList.toggle('nav-btn-active', isActive);
  });

  mobileButtons.forEach(btn => {
    const isActive = btn.dataset.view === name;
    btn.classList.toggle('mobile-btn-active', isActive);
  });

  if (name === 'stats') {
    renderCharts();
  }
}


export function initNavigation() {
  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  mobileButtons.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function updateTokenUI() {
  const status = document.getElementById('tokenStatus');
  if (status) {
    status.textContent = state.token ? 'Connecté' : 'Non connecté';
  }
}

export function updateKPIs() {
  document.getElementById('kpiTotal').textContent = String(state.stats.total);
  document.getElementById('kpiAccuracy').textContent = `${state.stats.accuracy}%`;
  document.getElementById('kpiAsterix').textContent = String(state.stats.asterix);
  document.getElementById('kpiObelix').textContent = String(state.stats.obelix);
}

export function renderHistory() {
  const container = document.getElementById('historyGrid');
  const empty = document.getElementById('historyEmpty');
  if (!container || !empty) return;

  container.innerHTML = '';
  if (!state.guesses.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  state.guesses.forEach(g => {
    const card = document.createElement('article');
    card.className = 'guess-card';

    const thumb = document.createElement('div');
    thumb.className = 'guess-thumb';
    if (g.imagepath) {
      const img = document.createElement('img');
      img.src =  buildImageUrl(g.imagepath);  // <--- ON CORRIGE ICI, PAS LE RESTE
      img.alt = `Guess ${g.id}`;
      thumb.appendChild(img);
    }
    card.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'guess-body';

    const meta = document.createElement('div');
    meta.className = 'guess-meta';
    meta.innerHTML = `<span>#${g.id ?? '—'}</span><span>${formatDate(g.date)}</span>`;
    body.appendChild(meta);

    const title = document.createElement('h4');
    title.className = 'guess-title';
    title.textContent = (g.guess || 'inconnu').toUpperCase();
    body.appendChild(title);

    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.flexWrap = 'wrap';
    badges.style.gap = '6px';

    const bGuess = document.createElement('span');
    bGuess.className = 'badge badge-yellow';
    bGuess.textContent = `Guess : ${g.guess || '—'}`;
    badges.appendChild(bGuess);

    const bFb = document.createElement('span');
    bFb.className = `badge ${feedbackClass(g.win)}`;
    bFb.textContent = `Feedback : ${feedbackLabel(g.win)}`;
    badges.appendChild(bFb);

    body.appendChild(badges);

    const path = document.createElement('div');
    path.className = 'contenu2';
    path.style.fontSize = '11px';
    path.textContent = `Image : ${g.imagepath || 'non fournie'}`;
    body.appendChild(path);

    card.appendChild(body);
    container.appendChild(card);
  });
}

function feedbackLabel(v) {
  if (v === 1 || v === '1') return 'vrai';
  if (v === 0 || v === '0') return 'inconnu';
  if (v === -1 || v === '-1') return 'faux';
  return 'none';
}

function feedbackClass(v) {
  if (v === 1 || v === '1') return 'badge-green';
  if (v === 0 || v === '0') return 'badge-blue';
  if (v === -1 || v === '-1') return 'badge-red';
  return 'badge-yellow';
}

function formatDate(value) {
  if (!value) return 'Date inconnue';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('fr-FR');
}