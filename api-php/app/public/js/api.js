// js/api.js
import { state } from './state.js';

// Backend Slim expose /api/... (cf. /api/login dans ton code PHP)
const API_BASE = 'http://localhost:8080/api';

function authHeaders(json = false) {
  const headers = {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

// =================== LOGIN ===================

export async function login(email, pass) {
  const payload = { email, pass };

  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Réponse brute /api/login :', raw);
    throw new Error('Réponse JSON invalide renvoyée par /login');
  }

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Authentification refusée');
  }
  if (!data.token) {
    throw new Error('Token manquant dans la réponse /login');
  }
  return data; // { success, message, token }
}

// =================== GUESSES (public) ===================

export async function postGuess(file) {
  const formData = new FormData();
  formData.append('guessimage', file);

  const res = await fetch(`${API_BASE}/guesses`, {
    method: 'POST',
    body: formData
  });

  const raw = await res.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Réponse brute /guesses (POST) :', raw);
    throw new Error('Réponse JSON invalide renvoyée par /guesses');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Erreur lors de la prédiction');
  }
  return data; // NewGuess
}

export async function putFeedback(id, win) {
  const res = await fetch(`${API_BASE}/guesses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ win })
  });

  const raw = await res.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Réponse brute /guesses/${id} (PUT) :`, raw);
    throw new Error('Réponse JSON invalide renvoyée par /guesses/{id}');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Erreur lors du feedback');
  }
  return data; // GuessesResult
}

// =================== GUESSES (protégé) ===================

export async function getGuesses() {
  const res = await fetch(`${API_BASE}/guesses`, {
    headers: authHeaders()
  });

  const raw = await res.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Réponse brute /guesses (GET) :', raw);
    throw new Error('Réponse JSON invalide renvoyée par /guesses');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Impossible de charger l’historique');
  }
  return Array.isArray(data) ? data : [];
}

export async function getGuessesImages() {
  const res = await fetch(`${API_BASE}/guesses/images`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('Réponse brute /guesses/images :', txt);
    throw new Error(txt || 'Impossible de télécharger le ZIP');
  }

  return await res.blob(); // archive ZIP
}

export async function deleteGuesses() {
  const res = await fetch(`${API_BASE}/guesses`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  const raw = await res.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Réponse brute /guesses (DELETE) :', raw);
    throw new Error('Réponse JSON invalide renvoyée par /guesses (DELETE)');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Suppression refusée');
  }
  return data; // GuessesClean
}