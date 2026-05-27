// js/state.js

export const state = {
  token: '',
  guesses: [],
  lastGuess: null,
  stats: {
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
  },
  cameraStream: null
};

export function setToken(token) {
  state.token = token || '';

  try {
    if (state.token) {
      sessionStorage.setItem('toutatix_token', state.token);
    } else {
      sessionStorage.removeItem('toutatix_token');
    }
  } catch {
    // stockage indisponible, on garde juste l'état en mémoire
  }
}

export function loadTokenFromStorage() {
  try {
    const t = sessionStorage.getItem('toutatix_token');
    if (t) state.token = t;
  } catch {
    // stockage indisponible
  }
  return state.token;
}


export function computeStats(guesses) {
  const stats = {
    total: guesses.length,
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

  for (const g of guesses) {
    const guess = String(g.guess || '').trim().toLowerCase();
    const win = g.win === null || g.win === undefined || g.win === '' ? null : Number(g.win);

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