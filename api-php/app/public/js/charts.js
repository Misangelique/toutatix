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

// Images chargées en module pour pouvoir les dessiner directement sur le canvas.
const romanHelmetImage = new Image();
romanHelmetImage.src = new URL('../assets/stats-le-village/Casque_Romain.png', import.meta.url).href;

const asterixImage = new Image();
asterixImage.src = new URL('../assets/stats-le-village/Asterix_Transparent.png', import.meta.url).href;

const obelixImage = new Image();
obelixImage.src = new URL('../assets/stats-le-village/Obelix_Transparent.png', import.meta.url).href;

const idefixImage = new Image();
idefixImage.src = new URL('../assets/stats-le-village/Idefix_Transparent.png', import.meta.url).href;

const FEEDBACK_ICON_IMAGE_SIZE = 40;
const FEEDBACK_ICON_UNKNOWN_SIZE = 36;
// Astérix est un peu plus grand que la base, Obélix légèrement agrandi seulement.
const ASTERIX_ICON_SIZE = FEEDBACK_ICON_IMAGE_SIZE * 2;
const OBELIX_ICON_SIZE = FEEDBACK_ICON_IMAGE_SIZE * 1.5;

function ensureImageRedrawOnLoad(chart, image) {
  // Si l'image n'est pas encore prête, on redessine le chart dès qu'elle est chargée.
  if (!image || image.complete || image.__toutatixReadyListenerAttached) return;

  image.__toutatixReadyListenerAttached = true;
  image.addEventListener('load', () => chart.draw());
}

function drawImageIcon(ctx, image, x, y, size = FEEDBACK_ICON_IMAGE_SIZE) {
  if (!image || !image.complete || !image.naturalWidth) return;

  // On conserve le ratio d'origine pour éviter d'écraser l'image.
  const ratio = image.naturalWidth / image.naturalHeight;
  let drawWidth = size;
  let drawHeight = size;

  if (ratio > 1) {
    drawHeight = size / ratio;
  } else {
    drawWidth = size * ratio;
  }

  ctx.drawImage(image, x - drawWidth / 2, y - drawHeight, drawWidth, drawHeight);
}

function drawUnknownIcon(ctx, x, y, size = FEEDBACK_ICON_UNKNOWN_SIZE) {
  ctx.save();
  ctx.translate(x, y - size / 2);

  ctx.fillStyle = '#fff8f6';
  ctx.strokeStyle = '#2c1810';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2c1810';
  ctx.font = `bold ${Math.max(11, Math.floor(size * 0.72))}px Spline Sans, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 0.5);

  ctx.restore();
}

const feedbackIconsPlugin = {
  id: 'feedbackIconsPlugin',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;

    // On dessine une icône au-dessus de chaque barre visible selon la série.
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta || meta.hidden) return;

      meta.data.forEach((element, pointIndex) => {
        const value = Number(dataset.data?.[pointIndex] ?? 0);
        if (!(value > 0)) return;

        const iconX = element.x;
        const iconY = element.y - 10;

        if (datasetIndex === 0) {
          const characterImage = pointIndex === 0 ? asterixImage : obelixImage;
          ensureImageRedrawOnLoad(chart, characterImage);
          drawImageIcon(
            ctx,
            characterImage,
            iconX,
            iconY,
            pointIndex === 0 ? ASTERIX_ICON_SIZE : OBELIX_ICON_SIZE
          );
          return;
        }

        if (datasetIndex === 1) {
          ensureImageRedrawOnLoad(chart, romanHelmetImage);
          drawImageIcon(ctx, romanHelmetImage, iconX, iconY, FEEDBACK_ICON_IMAGE_SIZE);
          return;
        }

        if (datasetIndex === 2) {
          drawUnknownIcon(ctx, iconX, iconY, FEEDBACK_ICON_UNKNOWN_SIZE);
          return;
        }

        if (datasetIndex === 3) {
          ensureImageRedrawOnLoad(chart, idefixImage);
          drawImageIcon(ctx, idefixImage, iconX, iconY, FEEDBACK_ICON_IMAGE_SIZE);
        }
      });
    });
  }
};

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
    const characterMaxValue = Math.max(
      stats.asterixTrue,
      stats.asterixFalse,
      stats.asterixUnknown,
      stats.asterixNoFeedback,
      stats.obelixTrue,
      stats.obelixFalse,
      stats.obelixUnknown,
      stats.obelixNoFeedback,
      1
    );

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
        indexAxis: 'x',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 52
          }
        },
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
            ticks: {
              color: '#5c4039',
              precision: 0
            },
            grid: {
              color: 'rgba(44, 24, 16, 0.12)'
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: characterMaxValue + 1,
            ticks: {
              color: '#2c1810',
              font: {
                weight: 'bold'
              },
              stepSize: 1
            },
            grid: {
              display: false
            }
          }
        }
      },
      plugins: [feedbackIconsPlugin]
    });
  }
}