// js/main.js
import { state, setToken, loadTokenFromStorage, computeStats } from './state.js';
import { login, postGuess, putFeedback, getGuesses, getGuessesImages, deleteGuesses } from './api.js';
import { renderCharts } from './charts.js';
import { initNavigation, switchView, setText, updateAuthUI, updateKPIs, renderHistory } from './ui.js';

let selectedFile = null;

// variables caméra
let cameraPreviewEl = null;
let startCameraBtn = null;
let stopCameraBtn = null;

document.addEventListener('DOMContentLoaded', () => {
  loadTokenFromStorage();

  initNavigation();
  initAnalyseEvents();
  initHistoryEvents();
  initLoginEvents();
  initHeaderAuth();

  computeStats([]);
  updateAuthUI();
  updateHeaderAuth();
  updateKPIs();
  renderHistory();
  renderCharts();

  switchView('analyse');

  initNavAutoRefresh();
});


// écoute les clics de nav envoyés par ui.js
function initNavAutoRefresh() {
  window.addEventListener('toutatix:navigate', async (e) => {
    const targetView = e.detail?.view;
    if (!targetView) return;

    // cas vues protégées : historisque / stats
    if ((targetView === 'historique' || targetView === 'stats') && state.auth.isAuthenticated) {
      try {
        await refreshProtectedData();
      } catch (err) {
        handleAuthError(err, targetView === 'historique' ? 'historyMessage' : 'loginMessage');
        return;
      }
    }

    switchView(targetView);
  });
}


function resetAppAfterLogout(message = 'Déconnecté.') {
  setToken('');
  state.guesses = [];
  state.lastGuess = null;

  computeStats([]);
  updateAuthUI();
  updateHeaderAuth();
  updateKPIs();
  renderHistory();
  renderCharts();

  stopCamera();

  setText('historyMessage', 'Connexion requise pour lire l\'historique.');
  setText('loginMessage', message);

  switchView('connexion');
}

function isUnauthorizedError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('401') || msg.includes('unauthorized') || msg.includes('non autorisé');
}

function handleAuthError(err, fallbackMessageId, fallbackPrefix = 'Erreur') {
  if (isUnauthorizedError(err)) {
    resetAppAfterLogout('Session expirée ou accès refusé. Reconnecte-toi.');
    return true;
  }

  setText(fallbackMessageId, `${fallbackPrefix} : ${err.message}`);
  return false;
}

async function refreshProtectedData(successMessage = '') {
  if (!state.auth.isAuthenticated) {
    renderHistory();
    renderCharts();
    return;
  }

  const guesses = await getGuesses();
  state.guesses = guesses;
  computeStats(guesses);
  updateKPIs();
  renderHistory();
  renderCharts();

  if (successMessage) {
    setText('historyMessage', successMessage);
  }
}

function initAnalyseEvents() {
  const fileInput = document.getElementById('guessFile');
  const preview = document.getElementById('previewImage');
  const dropzoneContent = document.getElementById('dropzoneContent');

  cameraPreviewEl = document.getElementById('cameraPreview');
  startCameraBtn = document.getElementById('startCameraBtn');
  stopCameraBtn = document.getElementById('stopCameraBtn');

  if (startCameraBtn && cameraPreviewEl) {
    startCameraBtn.addEventListener('click', startCamera);
  }

  if (stopCameraBtn && cameraPreviewEl) {
    stopCameraBtn.addEventListener('click', stopCamera);
  }
  updateCameraButtons();


  fileInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = ev => {
      if (preview) {
        preview.src = ev.target?.result || '';
        preview.style.display = 'block';
      }
      if (dropzoneContent) dropzoneContent.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('resetGuessBtn')?.addEventListener('click', () => {
    selectedFile = null;

    if (fileInput) fileInput.value = '';
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
    if (dropzoneContent) dropzoneContent.style.display = 'flex';

    setText('analyseMessage', 'Sélection effacée.');
  });

  document.getElementById('sendGuessBtn')?.addEventListener('click', onSendGuess);

  document.querySelectorAll('[data-feedback]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.feedback);
      onFeedback(val);
    });
  });
}

function updateCameraButtons() {
  if (!startCameraBtn || !stopCameraBtn) return;

  const isOn = !!state.cameraStream;

  // caméra allumée -> on montre "Couper", on cache "Activer"
  startCameraBtn.style.display = isOn ? 'none' : '';
  stopCameraBtn.style.display = isOn ? '' : 'none';
}

async function startCamera() {
  if (!cameraPreviewEl) return;

  if (state.cameraStream) {
    cameraPreviewEl.style.display = 'block';
    updateCameraButtons();
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideo = devices.some(d => d.kind === 'videoinput');

    if (!hasVideo) {
      setText('analyseMessage', 'Aucune caméra détectée sur cet appareil.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    state.cameraStream = stream;
    cameraPreviewEl.srcObject = stream;
    cameraPreviewEl.style.display = 'block';
    setText('analyseMessage', 'Caméra activée.');

    updateCameraButtons();
  } catch (err) {
    setText('analyseMessage', `Impossible d’accéder à la caméra : ${err.name || ''} ${err.message}`);
  }
}

function stopCamera() {
  if (!cameraPreviewEl) return;

  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }

  cameraPreviewEl.srcObject = null;
  cameraPreviewEl.style.display = 'none';
  setText('analyseMessage', 'Caméra désactivée.');

  updateCameraButtons();
}

async function onSendGuess() {
  if (!selectedFile) {
    setText('analyseMessage', 'Choisis une image avant de lancer l\'analyse.');
    return;
  }

  setText('analyseMessage', 'Envoi de l\'image…');

  try {
    const data = await postGuess(selectedFile);
    state.lastGuess = data;

    const resultLabel = document.getElementById('guessResultLabel');
    const guessIdBadge = document.getElementById('guessIdBadge');
    const guessMetaText = document.getElementById('guessMetaText');

    if (resultLabel) resultLabel.textContent = (data.guess || 'Inconnu').toUpperCase();
    if (guessIdBadge) guessIdBadge.textContent = `ID : ${data.id ?? '—'}`;
    if (guessMetaText) {
      guessMetaText.textContent = `Image : ${data.imagepath || 'n/a'} · Date : ${data.date || 'n/a'}`;
    }

    setText('analyseMessage', 'Prédiction reçue.');
    setText('feedbackMessage', 'Tu peux maintenant envoyer un feedback.');
  } catch (err) {
    setText('analyseMessage', `Erreur : ${err.message}`);
  }
}

async function onFeedback(win) {
  if (!state.lastGuess?.id) {
    setText('feedbackMessage', 'Aucune prédiction à corriger.');
    return;
  }

  setText('feedbackMessage', 'Envoi du feedback…');

  try {
    const data = await putFeedback(state.lastGuess.id, win);
    setText(
        'feedbackMessage',
        `Feedback enregistré. Total : ${data.total ?? '—'} · Wins : ${data.win ?? '—'}`
    );

    if (state.auth.isAuthenticated) {
      await refreshProtectedData();
    }
  } catch (err) {
    handleAuthError(err, 'feedbackMessage');
  }
}

function initLoginEvents() {
  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('emailInput')?.value.trim() || '';
    const pass = document.getElementById('passwordInput')?.value.trim() || '';

    if (!email || !pass) {
      setText('loginMessage', 'Renseigne email et mot de passe.');
      return;
    }

    setText('loginMessage', 'Connexion en cours…');

    try {
      const data = await login(email, pass);
      setToken(data.token);
      updateAuthUI();
      updateHeaderAuth();
      setText('loginMessage', data.message || 'Connexion réussie.');

      await refreshProtectedData();
      switchView('historique');
    } catch (err) {
      setToken('');
      updateAuthUI();
      updateHeaderAuth();
      setText('loginMessage', `Erreur : ${err.message}`);
    }
  });
}

async function downloadImage(url, filename = 'image.jpg') {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectUrl);
    setText('historyMessage', 'Téléchargement lancé.');
  } catch (err) {
    setText('historyMessage', `Téléchargement impossible : ${err.message}`);
  }
}

function initHistoryEvents() {
  document.getElementById('historyGrid')?.addEventListener('click', async e => {
    const btn = e.target.closest('.guess-download-btn');
    if (!btn) return;

    const url = btn.dataset.imageUrl;
    const filename = btn.dataset.filename || 'guess-image.jpg';

    if (!url) {
      setText('historyMessage', 'Aucune image à télécharger.');
      return;
    }

    await downloadImage(url, filename);
  });

  document.getElementById('downloadImagesBtn')?.addEventListener('click', async () => {
    if (!state.auth.isAuthenticated) {
      setText('historyMessage', 'Connexion requise pour télécharger le ZIP.');
      switchView('connexion');
      return;
    }

    try {
      const blob = await getGuessesImages();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'toutatix-images.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      setText('historyMessage', 'Archive ZIP téléchargée.');
    } catch (err) {
      handleAuthError(err, 'historyMessage');
    }
  });

  document.getElementById('deleteAllBtn')?.addEventListener('click', async () => {
    if (!state.auth.isAuthenticated) {
      setText('historyMessage', 'Connexion requise pour supprimer.');
      switchView('connexion');
      return;
    }

    if (!state.auth.isAdmin) {
      setText('historyMessage', 'Accès refusé : droits administrateur requis.');
      return;
    }

    if (!confirm('Supprimer tout l\'historique et toutes les images ?')) return;

    try {
      const data = await deleteGuesses();
      state.guesses = [];
      computeStats([]);
      updateKPIs();
      renderHistory();
      renderCharts();
      setText('historyMessage', data.message || 'Historique supprimé.');
    } catch (err) {
      handleAuthError(err, 'historyMessage');
    }
  });
}

// =================== HEADER AUTH ===================

function updateHeaderAuth() {
  const center = document.getElementById('headerCenter');
  if (!center) return;

  if (!state.auth.isAuthenticated || !state.auth.user) {
    center.innerHTML = '';
    center.style.display = 'none';
    return;
  }

  const email =
      state.auth.user?.data?.username ||
      state.auth.user?.username ||
      state.auth.user?.email ||
      state.auth.user?.sub ||
      '';

  center.innerHTML = `
    <img src="assets/header-screen.png" alt="Toutatix" class="global-header-screen">
    <span class="global-header-email">${email}</span>
  `;
  center.style.display = 'flex';
}

function initHeaderAuth() {
  const headerBtn = document.getElementById('headerAuthBtn');
  if (!headerBtn) return;

  headerBtn.addEventListener('click', () => {
    if (state.auth.isAuthenticated) {
      resetAppAfterLogout('Déconnecté.');
    } else {
      switchView('connexion');
    }
  });
}
