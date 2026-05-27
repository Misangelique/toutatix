// js/charts.js
import { state } from './state.js';

let statsChart = null;
let guessTypeChart = null;
let characterDetailChart = null;

function destroyChart(chart) {
  if (chart) chart.destroy();
}

function hasNonZeroData(values) {
  return values.some(v => Number(v) > 0);
}

function doughnutDataset(values, colors) {
  if (hasNonZeroData(values)) {
    return {
      data: values,
      backgroundColor: colors,
      borderColor: '#2c1810',
      borderWidth: 2,
      hoverOffset: 6
    };
  }

  return {
    data: [1],
    backgroundColor: ['#ead8d1'],
    borderColor: '#2c1810',
    borderWidth: 2,
    hoverOffset: 0
  };
}

export function renderCharts() {
  const { stats } = state;

  const statsCanvas = document.getElementById('statsChart');
  const guessTypeCanvas = document.getElementById('guessTypeChart');
  const characterDetailCanvas = document.getElementById('characterDetailChart');

  destroyChart(statsChart);
  destroyChart(guessTypeChart);
  destroyChart(characterDetailChart);

  statsChart = null;
  guessTypeChart = null;
  characterDetailChart = null;

  if (statsCanvas) {
    const statsValues = [stats.wins, stats.invalid, stats.losses, stats.noFeedback];
    const hasStatsData = hasNonZeroData(statsValues);

    statsChart = new Chart(statsCanvas, {
      type: 'doughnut',
      data: {
        labels: hasStatsData
            ? ['Vrai', 'Inconnu', 'Faux', 'Sans feedback']
            : ['Aucune donnée'],
        datasets: [
          doughnutDataset(statsValues, ['#81c810', '#4a8aff', '#c8102e', '#f4c95d'])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#2c1810',
              boxWidth: 14,
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                if (!hasStatsData) return 'Aucune donnée';
                return `${context.label} : ${context.raw}`;
              }
            }
          }
        }
      }
    });
  }

  if (guessTypeCanvas) {
    const guessValues = [stats.asterix, stats.obelix];
    const hasGuessData = hasNonZeroData(guessValues);

    guessTypeChart = new Chart(guessTypeCanvas, {
      type: 'doughnut',
      data: {
        labels: hasGuessData
            ? ['Astérix', 'Obélix']
            : ['Aucune donnée'],
        datasets: [
          doughnutDataset(guessValues, ['#fccc38', '#ff9f1c'])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#2c1810',
              boxWidth: 14,
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                if (!hasGuessData) return 'Aucune donnée';
                return `${context.label} : ${context.raw}`;
              }
            }
          }
        }
      }
    });
  }

  if (characterDetailCanvas) {
    characterDetailChart = new Chart(characterDetailCanvas, {
      type: 'bar',
      data: {
        labels: ['Astérix', 'Obélix'],
        datasets: [
          {
            label: 'Vrai',
            data: [stats.asterixTrue, stats.obelixTrue],
            backgroundColor: '#81c810',
            borderColor: '#5e930b',
            borderWidth: 1,
            borderRadius: 8
          },
          {
            label: 'Faux',
            data: [stats.asterixFalse, stats.obelixFalse],
            backgroundColor: '#c8102e',
            borderColor: '#930c22',
            borderWidth: 1,
            borderRadius: 8
          },
          {
            label: 'Inconnu',
            data: [stats.asterixUnknown, stats.obelixUnknown],
            backgroundColor: '#4a8aff',
            borderColor: '#2c69d1',
            borderWidth: 1,
            borderRadius: 8
          },
          {
            label: 'Sans feedback',
            data: [stats.asterixNoFeedback, stats.obelixNoFeedback],
            backgroundColor: '#f4c95d',
            borderColor: '#d7ab39',
            borderWidth: 1,
            borderRadius: 8
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#2c1810',
              boxWidth: 14,
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label} : ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              color: '#5c4039',
              precision: 0
            },
            grid: {
              color: 'rgba(44, 24, 16, 0.12)'
            }
          },
          y: {
            stacked: true,
            ticks: {
              color: '#2c1810',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}