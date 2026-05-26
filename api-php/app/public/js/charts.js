// js/charts.js
import { state } from './state.js';

let mainChart = null;
let typeChart = null;

export function renderCharts() {
  const { stats } = state;
  const mainCtx = document.getElementById('statsChart');
  const typeCtx = document.getElementById('guessTypeChart');

  if (!mainCtx || !typeCtx) return;

  if (mainChart) mainChart.destroy();
  if (typeChart) typeChart.destroy();

  mainChart = new Chart(mainCtx, {
    type: 'bar',
    data: {
      labels: ['Résultats IA'],
      datasets: [
        { label: 'Réussies', data: [stats.wins], backgroundColor: '#81c810' },
        { label: 'Invalides', data: [stats.invalid], backgroundColor: '#4a8aff' },
        { label: 'Ratées', data: [stats.losses], backgroundColor: '#c8102e' },
        { label: 'Sans feedback', data: [stats.noFeedback], backgroundColor: '#fccc38' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#2c1810' } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#2c1810' } },
        y: { stacked: true, beginAtZero: true, ticks: { color: '#2c1810' } }
      }
    }
  });

  typeChart = new Chart(typeCtx, {
    type: 'doughnut',
    data: {
      labels: ['Astérix', 'Obélix'],
      datasets: [
        {
          data: [stats.asterix, stats.obelix],
          backgroundColor: ['#ffcc66', '#f1a520'],
          borderColor: '#2c1810',
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#2c1810' } }
      }
    }
  });
}