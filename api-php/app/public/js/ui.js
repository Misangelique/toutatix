// js/ui.js
import { state } from './state.js';
import { renderCharts } from './charts.js';

const API_HOST = 'http://localhost:8080';
const PROTECTED_VIEWS = new Set(['historique', 'stats']);

function getViews() {
  return document.querySelectorAll('.view');
}

function getSidebarButtons() {
  return document.querySelectorAll('.nav-btn');
}

function getMobileButtons() {
  return document.querySelectorAll('.mobile-btn');
}

function buildImageUrl(imagePath) {
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${API_HOST}/data/uploads/${imagePath.replace(/^\/+/, '')}`;
}

function getDownloadFilename(guess) {
  const rawGuess = String(guess?.guess || 'image').trim().toLowerCase();
  const safeGuess = rawGuess || 'image';
  const safeId = guess?.id ?? 'unknown';
  return `toutatix-${safeGuess}-${safeId}.jpg`;
}

export function switchView(name) {
  let target = name;

  if (PROTECTED_VIEWS.has(target) && !state.auth.isAuthenticated) {
    setText('loginMessage', 'Connexion requise pour accéder à cette vue.');
    target = 'connexion';
  }

  getViews().forEach(v => {
    const match = v.classList.contains(`view-${target}`);
    v.classList.toggle('view-active', match);
  });

  getSidebarButtons().forEach(btn => {
    const isActive = btn.dataset.view === target;
    btn.classList.toggle('nav-btn-active', isActive);
  });

  getMobileButtons().forEach(btn => {
    const isActive = btn.dataset.view === target;
    btn.classList.toggle('mobile-btn-active', isActive);
  });

  if (target === 'stats') {
    renderCharts();
  }
}

export function initNavigation() {
  getSidebarButtons().forEach(btn => {
    btn.addEventListener('click', () => {
      onNavClick(btn.dataset.view);
    });
  });

  getMobileButtons().forEach(btn => {
    btn.addEventListener('click', () => {
      onNavClick(btn.dataset.view);
    });
  });
}

// nouvelle fonction dans ui.js
export function onNavClick(viewName) {
  // on laisse main.js décider s’il doit rafraîchir
  const event = new CustomEvent('toutatix:navigate', {
    detail: { view: viewName }
  });
  window.dispatchEvent(event);
}

export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function updateAuthUI() {
  const status = document.getElementById('tokenStatus');
  const deleteBtn = document.getElementById('deleteAllBtn');

  if (status) {
    status.textContent = state.auth.isAuthenticated ? 'Connecté' : 'Non connecté';
  }

  if (deleteBtn) {
    deleteBtn.style.display = state.auth.isAdmin ? '' : 'none';
  }
}

export function updateKPIs() {
  const total = document.getElementById('kpiTotal');
  const accuracy = document.getElementById('kpiAccuracy');
  const asterix = document.getElementById('kpiAsterix');
  const obelix = document.getElementById('kpiObelix');

  if (total) total.textContent = String(state.stats.total);
  if (accuracy) accuracy.textContent = `${state.stats.accuracy}%`;
  if (asterix) asterix.textContent = String(state.stats.asterix);
  if (obelix) obelix.textContent = String(state.stats.obelix);
}

export function renderHistory() {
  const container = document.getElementById('historyGrid');
  const empty = document.getElementById('historyEmpty');
  if (!container || !empty) return;

  container.innerHTML = '';

  if (!state.auth.isAuthenticated) {
    empty.style.display = 'block';
    empty.textContent = 'Connexion requise pour afficher l’historique.';
    return;
  }

  if (!state.guesses.length) {
    empty.style.display = 'block';
    empty.textContent = 'Aucun guess enregistré pour le moment.';
    return;
  }

  empty.style.display = 'none';

  state.guesses.forEach(g => {
    const card = document.createElement('article');
    card.className = 'guess-card';

    const thumb = document.createElement('div');
    thumb.className = 'guess-thumb';

    const imageUrl = buildImageUrl(g.imagepath);

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Guess ${g.id}`;
      img.loading = 'lazy';
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

    if (imageUrl) {
      const actions = document.createElement('div');
      actions.className = 'actions';

      const downloadBtn = document.createElement('button');
      downloadBtn.type = 'button';
      downloadBtn.className = 'btn btn-ghost hover-dark guess-download-btn';
      downloadBtn.dataset.imageUrl = imageUrl;
      downloadBtn.dataset.filename = getDownloadFilename(g);
      downloadBtn.textContent = 'Télécharger l’image';

      actions.appendChild(downloadBtn);
      body.appendChild(actions);
    }

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