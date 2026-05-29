// js/state.js

function createEmptyStats() {
  return {
    total: 0,
    wins: 0,
    invalid: 0,
    losses: 0,
    noFeedback: 0,
    asterix: 0,
    obelix: 0,
    accuracy: 0,

    asterixTrue: 0,
    asterixFalse: 0,
    asterixUnknown: 0,
    asterixNoFeedback: 0,

    obelixTrue: 0,
    obelixFalse: 0,
    obelixUnknown: 0,
    obelixNoFeedback: 0
  };
}

export const state = {
  token: '',
  auth: {
    isAuthenticated: false,
    isAdmin: false,
    isExpired: false,
    user: null
  },
  guesses: [],
  lastGuess: null,
  stats: createEmptyStats(),
  cameraStream: null
};

function decodeBase64Url(base64Url) {
  let base64 = String(base64Url || '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  return atob(base64);
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;

    const json = decodeURIComponent(
        decodeBase64Url(parts[1])
            .split('')
            .map(c => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
            .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function extractIsAdmin(payload) {
  if (!payload) return false;

  // cas simples (au cas où tu changes plus tard)
  if (payload.admin === true) return true;
  if (payload.isAdmin === true) return true;

  // CAS RÉEL DE TON API : admin dans payload.data.admin
  if (payload.data && payload.data.admin === true) return true;

  const role = normalizeRole(payload.role);
  if (role === 'admin' || role === 'role_admin') return true;

  if (Array.isArray(payload.roles)) {
    return payload.roles.some(r => {
      const nr = normalizeRole(r);
      return nr === 'admin' || nr === 'role_admin';
    });
  }

  return false;
}

function extractIsExpired(payload) {
  if (!payload || typeof payload.exp !== 'number') return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
}

function syncAuthFromToken() {
  const payload = decodeJwtPayload(state.token);

  state.auth.user = payload || null;
  state.auth.isExpired = extractIsExpired(payload);
  state.auth.isAdmin = extractIsAdmin(payload);
  state.auth.isAuthenticated = !!state.token && !state.auth.isExpired;
}

export function setToken(token) {
  state.token = token || '';

  try {
    if (state.token) {
      sessionStorage.setItem('toutatix_token', state.token);
    } else {
      sessionStorage.removeItem('toutatix_token');
    }
  } catch {}

  syncAuthFromToken();
}

export function loadTokenFromStorage() {
  try {
    const t = sessionStorage.getItem('toutatix_token');
    if (t) {
      state.token = t;
    } else {
      state.token = '';
    }
  } catch {
    state.token = '';
  }

  syncAuthFromToken();
  return state.token;
}

export function computeStats(guesses) {
  const stats = createEmptyStats();
  stats.total = guesses.length;

  for (const g of guesses) {
    const guess = String(g.guess || '').trim().toLowerCase();
    const win = g.win === null || g.win === undefined || g.win === ''
        ? null
        : Number(g.win);

    if (guess === 'asterix') {
      stats.asterix++;

      if (win === 1) stats.asterixTrue++;
      else if (win === -1) stats.asterixFalse++;
      else if (win === 0) stats.asterixUnknown++;
      else stats.asterixNoFeedback++;
    } else if (guess === 'obelix') {
      stats.obelix++;

      if (win === 1) stats.obelixTrue++;
      else if (win === -1) stats.obelixFalse++;
      else if (win === 0) stats.obelixUnknown++;
      else stats.obelixNoFeedback++;
    }

    if (win === 1) stats.wins++;
    else if (win === 0) stats.invalid++;
    else if (win === -1) stats.losses++;
    else stats.noFeedback++;
  }

  const fbCount = stats.wins + stats.invalid + stats.losses;
  stats.accuracy = fbCount ? Math.round((stats.wins / fbCount) * 100) : 0;

  state.stats = stats;
  return stats;
}

// uniquement pour debug dans la console
if (typeof window !== 'undefined') {
  window.__toutatixState = state;
  console.log(window.__toutatixState);
}