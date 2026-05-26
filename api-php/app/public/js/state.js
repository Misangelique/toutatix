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
    accuracy: 0
  },
  cameraStream: null
};

export function setToken(token) {
  state.token = token || '';
  // optionnel : persist en session
  if (state.token) {
    sessionStorage.setItem('toutatix_token', state.token);
  } else {
    sessionStorage.removeItem('toutatix_token');
  }
}

export function loadTokenFromStorage() {
  const t = sessionStorage.getItem('toutatix_token');
  if (t) state.token = t;
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
    accuracy: 0
  };

  for (const g of guesses) {
    if (g.guess === 'asterix') stats.asterix++;
    if (g.guess === 'obelix') stats.obelix++;

    const win = g.win;
    if (win === 1 || win === '1') stats.wins++;
    else if (win === 0 || win === '0') stats.invalid++;
    else if (win === -1 || win === '-1') stats.losses++;
    else stats.noFeedback++;
  }

  const fbCount = stats.wins + stats.invalid + stats.losses;
  stats.accuracy = fbCount ? Math.round((stats.wins / fbCount) * 100) : 0;

  state.stats = stats;
  return stats;
}