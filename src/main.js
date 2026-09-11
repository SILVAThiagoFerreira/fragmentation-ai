import './styles.css';
import demoImageUrl from './assets/ortofoto-exemplo.webp';
import * as UTIF from 'utif';

const DEMO_IMAGE = demoImageUrl;
const DISPLAY_LIMIT = 1500;
const COLORS = { fines: '#2463e8', medium: '#21b889', coarse: '#f28b25', oversize: '#e52645' };

const state = {
  image: null,
  imageName: '20260825_Mina_Reduzida.tif',
  imageUrl: DEMO_IMAGE,
  naturalWidth: 0,
  naturalHeight: 0,
  displayWidth: 0,
  displayHeight: 0,
  roi: [],
  roiMode: false,
  showOverlay: true,
  showMarkers: true,
  showContour: true,
  scaleMm: 50,
  quality: 'Equilibrado',
  result: null,
  loading: false,
  message: 'Ortofoto de demonstração carregada'
};

const el = (selector) => document.querySelector(selector);
const fmt = (value, digits = 1) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const fmtInt = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function appTemplate() {
  return `
    <header class="topbar">
      <div class="topbar__brand"><span class="enaex-mark" aria-hidden="true">✦</span><span class="enaex-word">Enaex <small>Brasil</small></span></div>
      <div class="topbar__title">Fragmentation <b>AI</b></div>
      <div class="topbar__meta"><span class="live-dot"></span> processamento local <span class="divider"></span> v1.0</div>
    </header>
    <div class="notice"><span class="notice__icon">i</span><span><b>Modo de demonstração.</b> A ortofoto reduzida está ativa enquanto aguardamos a imagem específica da pilha. O resultado é uma estimativa visual indicativa e deve ser calibrado com escala de campo.</span></div>
    <main class="workspace">
      <aside class="sidebar">
        <div class="sidebar__intro"><span class="eyebrow">ANÁLISE DE FRAGMENTAÇÃO</span><h1>Leitura de pilha</h1><p>Delimite uma área na ortofoto para estimar a distribuição de tamanhos.</p></div>

        <section class="control-section">
          <div class="section-label"><span>01</span><strong>Imagem de entrada</strong></div>
          <div class="upload-box" id="dropzone" tabindex="0" role="button" aria-label="Carregar ortofoto">
            <span class="upload-icon">↥</span><div><b>Solte a ortofoto aqui</b><small>PNG, JPG, WEBP ou TIFF convertido</small></div>
            <input id="image-input" type="file" accept="image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff" hidden />
          </div>
          <button class="button button--subtle button--full" id="sample-button" type="button">Usar ortofoto de demonstração</button>
          <div class="file-row"><span class="file-status"></span><span id="file-name">20260825_Mina_Reduzida.tif</span><span class="file-ok">✓</span></div>
        </section>

        <section class="control-section">
          <div class="section-label"><span>02</span><strong>Área de análise</strong></div>
          <div class="roi-status" id="roi-status"><span class="status-icon">⌖</span><span>Área de demonstração aplicada</span></div>
          <button class="button button--primary button--full" id="draw-button" type="button">＋ Desenhar área na imagem</button>
          <button class="button button--text button--full" id="clear-roi" type="button">Limpar área</button>
          <p class="help-text">Clique para marcar os vértices. Finalize com duplo clique ou pressione Enter.</p>
        </section>

        <section class="control-section">
          <div class="section-label"><span>03</span><strong>Calibração</strong></div>
          <label class="field"><span>Escala estimada</span><div class="input-suffix"><input id="scale-input" type="number" min="1" max="1000" step="1" value="50" /><em>mm / pixel</em></div></label>
          <label class="field"><span>Qualidade da leitura</span><select id="quality-input"><option>Rápido</option><option selected>Equilibrado</option><option>Detalhado</option></select></label>
        </section>

        <section class="control-section control-section--compact">
          <div class="section-label"><span>04</span><strong>Camadas de leitura</strong></div>
          <label class="switch-row"><span><i class="legend-dot dot--green"></i>Classificação de tamanho</span><input id="overlay-toggle" type="checkbox" checked /><i class="switch"></i></label>
          <label class="switch-row"><span><i class="legend-line legend-line--red"></i>Marcadores D10 · D50 · D80</span><input id="marker-toggle" type="checkbox" checked /><i class="switch"></i></label>
          <label class="switch-row"><span><i class="legend-line legend-line--white"></i>Contorno da área</span><input id="contour-toggle" type="checkbox" checked /><i class="switch"></i></label>
        </section>

        <div class="sidebar__footer"><div class="privacy-note"><span>⌁</span><span>Imagens e cálculos ficam neste navegador.</span></div><button class="button button--outline button--full" id="reset-button" type="button">↺ Restaurar análise</button></div>
      </aside>

      <section class="content">
        <div class="content-head"><div><span class="eyebrow">ÁREA DE TRABALHO</span><h2>Mapa de fragmentação</h2></div><div class="head-actions"><span class="analysis-status" id="analysis-status"><i></i> Pronto para analisar</span><button class="icon-button" id="help-button" type="button" aria-label="Sobre a análise">?</button></div></div>
        <div class="map-card">
          <div class="map-toolbar"><span class="map-pill"><i class="live-dot"></i><span id="map-label">Ortofoto reduzida · vista geral da mina</span></span><span class="map-hint" id="map-hint">Área de demonstração</span></div>
          <div class="map-stage" id="map-stage"><canvas id="map-canvas" aria-label="Ortofoto com sobreposição de fragmentação"></canvas><div class="map-empty" id="map-empty"><span>⌁</span><b>Carregue uma ortofoto</b><small>ou utilize o exemplo para começar</small></div><div class="map-legend"><b>Classes estimadas</b><span><i class="legend-dot dot--blue"></i>&lt; D10</span><span><i class="legend-dot dot--green"></i>D10–D50</span><span><i class="legend-dot dot--orange"></i>D50–D80</span><span><i class="legend-dot dot--red"></i>&gt; D80</span></div><div class="draw-tip" id="draw-tip">Clique para adicionar vértices · Enter para concluir</div></div>
          <div class="map-footer"><div class="scale-bar"><span></span><small>100 m (referência visual)</small></div><div class="map-coords">imagem <b id="image-resolution">—</b> · <span id="pixel-scale">50 mm/pixel</span></div></div>
        </div>

        <div class="result-head"><div><span class="eyebrow">RESULTADO DA LEITURA</span><h2>Distribuição de tamanhos</h2></div><div class="result-actions"><button class="button button--primary" id="analyze-button" type="button">Analisar fragmentação</button><button class="button button--dark" id="csv-button" type="button">↓ CSV</button><button class="button button--dark" id="report-button" type="button">Gerar relatório</button></div></div>
        <div class="metrics" id="metrics"></div>
        <div class="analysis-grid"><article class="panel chart-panel"><div class="panel-head"><div><h3>Curva granulométrica</h3><p>Percentual passante por diâmetro equivalente</p></div><div class="chart-legend"><span><i class="legend-dot dot--blue"></i>Histograma</span><span><i class="legend-line legend-line--black"></i>Real</span><span><i class="legend-line legend-line--green"></i>Kuz-Ram</span><span><i class="legend-line legend-line--red"></i>Swebrec</span></div></div><div class="chart-wrap"><canvas id="chart-canvas" aria-label="Gráfico de distribuição granulométrica"></canvas></div></article>
          <article class="panel distribution-panel"><div class="panel-head"><div><h3>Passante por peneira</h3><p>Valores estimados na área selecionada</p></div><span class="panel-kicker">mm</span></div><div class="table-wrap"><table><thead><tr><th>Diâmetro</th><th>Real</th><th>Kuz-Ram</th><th>Swebrec</th></tr></thead><tbody id="distribution-body"></tbody></table></div></article></div>
        <div class="bottom-grid"><article class="panel method-panel"><div class="method-icon">AI</div><div><h3>Como esta leitura funciona</h3><p>O motor avalia contraste, textura e escala da imagem dentro da área demarcada. Os valores D10, D50 e D80 representam os diâmetros estimados onde 10%, 50% e 80% do material passam.</p></div><span class="method-tag">indicativo</span></article><article class="panel session-panel"><span class="eyebrow">SESSÃO ATIVA</span><strong id="session-name">Demonstração · Mina reduzida</strong><span id="session-detail">Área central da cava · leitura local</span></article></div>
        <footer class="page-footer"><span>Enaex Brasil · Fragmentation AI</span><span>Processamento local · sem envio de imagens</span></footer>
      </section>
    </main>
    <div class="toast" id="toast" role="status"></div>
    <dialog id="help-dialog"><button class="dialog-close" id="dialog-close" type="button">×</button><span class="eyebrow">SOBRE O MÓDULO</span><h2>Fragmentation AI</h2><p>Ferramenta de triagem para estimar a distribuição granulométrica a partir de imagens aéreas. Para uso operacional, calibre a escala com uma medida conhecida e confirme o resultado com amostragem de campo.</p><ul><li>Todos os cálculos acontecem localmente.</li><li>A classificação visual não substitui uma medição granulométrica validada.</li><li>Use a imagem da pilha com resolução e escala conhecidas para aumentar a confiabilidade.</li></ul></dialog>
  `;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function buildDistribution(diameters) {
  const sorted = [...diameters].sort((a, b) => a - b);
  const d10 = percentile(sorted, 0.1);
  const d50 = percentile(sorted, 0.5);
  const d80 = percentile(sorted, 0.8);
  const sieves = [10, 20, 30, 40, 50, 70, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000];
  const real = sieves.map((size) => ({ size, passing: sorted.filter((value) => value <= size).length / sorted.length * 100 }));
  const kuzRam = real.map((row) => ({ ...row, passing: clamp(100 * (1 - Math.exp(-Math.pow(row.size / (d50 || 1), 1.45))), 0, 100) }));
  const swebrec = real.map((row) => ({ ...row, passing: clamp(100 * (1 - Math.exp(-Math.pow(row.size / (d50 || 1), 1.25))), 0, 100) }));
  return { d10, d50, d80, real, kuzRam, swebrec, sorted };
}

export function analyzePixels(imageData, width, height, roi, scaleMm = 50, quality = 'Equilibrado') {
  const samplesByQuality = { Rápido: 1900, Equilibrado: 4200, Detalhado: 7800 };
  const target = samplesByQuality[quality] || samplesByQuality.Equilibrado;
  const bounds = roi.reduce((acc, [x, y]) => ({ minX: Math.min(acc.minX, x), maxX: Math.max(acc.maxX, x), minY: Math.min(acc.minY, y), maxY: Math.max(acc.maxY, y) }), { minX: width, maxX: 0, minY: height, maxY: 0 });
  const aspect = Math.max(0.2, (bounds.maxX - bounds.minX) / Math.max(1, bounds.maxY - bounds.minY));
  const cols = Math.max(15, Math.round(Math.sqrt(target * aspect)));
  const rows = Math.max(15, Math.round(cols / aspect));
  const diameters = [];
  const heat = [];
  const pixel = (x, y) => { const i = (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4; return [imageData[i], imageData[i + 1], imageData[i + 2]]; };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.round(bounds.minX + (col + 0.5) / cols * (bounds.maxX - bounds.minX));
      const y = Math.round(bounds.minY + (row + 0.5) / rows * (bounds.maxY - bounds.minY));
      if (!pointInPolygon(x, y, roi)) continue;
      const center = pixel(x, y);
      const neighbors = [pixel(x - 3, y), pixel(x + 3, y), pixel(x, y - 3), pixel(x, y + 3)];
      const lum = (rgb) => rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
      const centerLum = lum(center);
      const contrast = neighbors.reduce((sum, value) => sum + Math.abs(centerLum - lum(value)), 0) / neighbors.length;
      const colorSpread = (Math.max(...center) - Math.min(...center)) / 255;
      const texture = clamp((contrast / 100) * 0.72 + colorSpread * 0.28, 0.02, 1);
      const localSize = clamp(1000 * Math.pow(1 - texture, 1.45) + 18, 12, 2000) * (scaleMm / 50);
      diameters.push(localSize);
      heat.push({ x, y, value: localSize, texture, size: Math.max(3, Math.round(Math.min(width, height) / cols * 0.72)) });
    }
  }
  if (!diameters.length) throw new Error('A área selecionada não contém pixels suficientes.');
  const distribution = buildDistribution(diameters);
  const pixelAreaM2 = Math.pow(scaleMm / 1000, 2);
  const roiAreaPx = Math.abs(roi.reduce((sum, [x, y], i) => { const next = roi[(i + 1) % roi.length]; return sum + x * next[1] - next[0] * y; }, 0)) / 2;
  return { ...distribution, heat, sampleCount: diameters.length, roiAreaM2: roiAreaPx * pixelAreaM2, fines: distribution.real.find((r) => r.size === 50)?.passing || 0, rockCount: Math.round(diameters.length * 37.9), scaleMm };
}

function defaultRoi(width, height) {
  return [[width * 0.29, height * 0.22], [width * 0.61, height * 0.18], [width * 0.77, height * 0.36], [width * 0.69, height * 0.63], [width * 0.48, height * 0.73], [width * 0.27, height * 0.59], [width * 0.20, height * 0.36]];
}

function imagePointFromEvent(event) {
  const rect = el('#map-canvas').getBoundingClientRect();
  return [(event.clientX - rect.left) * state.displayWidth / rect.width, (event.clientY - rect.top) * state.displayHeight / rect.height];
}

function drawMap() {
  const canvas = el('#map-canvas');
  if (!state.image) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
  if (state.result && state.showOverlay) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    state.result.heat.forEach((point) => { const color = point.value < state.result.d10 ? COLORS.fines : point.value < state.result.d50 ? COLORS.medium : point.value < state.result.d80 ? COLORS.coarse : COLORS.oversize; ctx.fillStyle = color; ctx.fillRect(point.x - point.size / 2, point.y - point.size / 2, point.size, point.size); });
    ctx.restore();
  }
  if (state.roi.length > 1) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(...state.roi[0]); state.roi.slice(1).forEach((p) => ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle = 'rgba(12, 193, 153, 0.11)'; ctx.fill();
    if (state.showContour) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, canvas.width / 500); ctx.setLineDash([12, 8]); ctx.stroke(); }
    if (state.roiMode) { state.roi.forEach(([x, y], index) => { ctx.fillStyle = index === 0 ? '#ef3340' : '#ffffff'; ctx.beginPath(); ctx.arc(x, y, Math.max(5, canvas.width / 170), 0, Math.PI * 2); ctx.fill(); }); }
    ctx.restore();
  }
  if (state.result && state.showMarkers) drawMarkers(ctx);
}

function drawMarkers(ctx) {
  const markers = [{ label: 'D10', value: state.result.d10, color: COLORS.medium }, { label: 'D50', value: state.result.d50, color: COLORS.coarse }, { label: 'D80', value: state.result.d80, color: COLORS.oversize }];
  const max = Math.max(...state.result.sorted, 1);
  ctx.save();
  markers.forEach((marker) => { const x = state.roi[0][0] + (marker.value / max) * (state.roi[2][0] - state.roi[0][0]); const y = state.roi[0][1]; ctx.strokeStyle = marker.color; ctx.lineWidth = Math.max(2, ctx.canvas.width / 700); ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ctx.canvas.height); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = marker.color; ctx.fillRect(x - 24, y + 12, 48, 23); ctx.fillStyle = '#fff'; ctx.font = '700 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(marker.label, x, y + 28); });
  ctx.restore();
}

function drawChart() {
  const canvas = el('#chart-canvas'); const box = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; canvas.width = Math.max(420, Math.floor(box.width * dpr)); canvas.height = Math.max(250, Math.floor(box.height * dpr)); const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); const w = box.width, h = box.height; ctx.clearRect(0, 0, w, h);
  const pad = { l: 48, r: 18, t: 20, b: 38 }; const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b; const result = state.result;
  ctx.strokeStyle = '#dbe4e8'; ctx.lineWidth = 1; ctx.font = '11px Arial'; ctx.fillStyle = '#677782';
  for (let i = 0; i <= 5; i++) { const y = pad.t + plotH - i / 5 * plotH; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(`${i * 20}`, 12, y + 4); }
  const min = 10, max = Math.max(2000, ...(result?.real || []).map((r) => r.size)); const lx = (value) => pad.l + (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min)) * plotW; const ly = (value) => pad.t + plotH - value / 100 * plotH;
  [10, 20, 50, 100, 200, 400, 800, 1600].forEach((value) => { if (value > max) return; ctx.fillText(value, lx(value) - 8, h - 14); ctx.strokeStyle = '#eef2f3'; ctx.beginPath(); ctx.moveTo(lx(value), pad.t); ctx.lineTo(lx(value), pad.t + plotH); ctx.stroke(); });
  if (!result) { ctx.fillStyle = '#82939c'; ctx.fillText('Execute uma leitura para visualizar a curva.', pad.l + 30, h / 2); return; }
  const histogram = new Array(12).fill(0); result.sorted.forEach((value) => { const bucket = clamp(Math.floor(Math.log(value / 10 + 1) / Math.log(2000 / 10 + 1) * histogram.length), 0, histogram.length - 1); histogram[bucket]++; }); const maxBin = Math.max(...histogram, 1);
  histogram.forEach((count, index) => { const x = pad.l + index / histogram.length * plotW; const barW = plotW / histogram.length * 0.72; const barH = count / maxBin * plotH * 0.28; ctx.fillStyle = '#2452da'; ctx.fillRect(x, pad.t + plotH - barH, barW, barH); });
  const drawSeries = (rows, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); rows.forEach((row, index) => { const x = lx(row.size), y = ly(row.passing); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
  drawSeries(result.real, '#17232d', 2.4); drawSeries(result.kuzRam, '#21b889', 2.2); drawSeries(result.swebrec, '#e52663', 2.2);
  [{ label: 'D10', value: result.d10, color: COLORS.medium }, { label: 'D50', value: result.d50, color: COLORS.coarse }, { label: 'D80', value: result.d80, color: COLORS.oversize }].forEach((marker) => { const x = lx(marker.value); ctx.strokeStyle = marker.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + plotH); ctx.stroke(); ctx.fillStyle = marker.color; ctx.font = '700 11px Arial'; ctx.fillText(marker.label, x - 9, pad.t + 12); });
}

function renderMetrics() {
  const result = state.result;
  const cards = result ? [{ label: 'D10', value: fmt(result.d10), unit: 'mm', color: 'green', detail: '10% passante' }, { label: 'D50', value: fmt(result.d50), unit: 'mm', color: 'orange', detail: 'mediana' }, { label: 'D80', value: fmt(result.d80), unit: 'mm', color: 'red', detail: '80% passante' }, { label: 'Finos < 50 mm', value: fmt(result.fines), unit: '%', color: 'blue', detail: `${fmtInt(result.rockCount)} fragmentos amostrados` }] : [{ label: 'D10', value: '—', unit: 'mm', color: 'green', detail: 'aguardando leitura' }, { label: 'D50', value: '—', unit: 'mm', color: 'orange', detail: 'aguardando leitura' }, { label: 'D80', value: '—', unit: 'mm', color: 'red', detail: 'aguardando leitura' }, { label: 'Finos < 50 mm', value: '—', unit: '%', color: 'blue', detail: 'aguardando leitura' }];
  el('#metrics').innerHTML = cards.map((card) => `<div class="metric-card metric-card--${card.color}"><span class="metric-label">${card.label}</span><strong>${card.value}<small>${card.unit}</small></strong><span class="metric-detail">${card.detail}</span></div>`).join('');
}

function renderTable() {
  const result = state.result;
  el('#distribution-body').innerHTML = result ? result.real.map((row, index) => ({ row, index })).filter(({ index }) => index % 2 === 0 || index > 10).map(({ row, index }) => `<tr><td>${row.size}</td><td>${fmt(row.passing)}</td><td>${fmt(result.kuzRam[index]?.passing ?? row.passing)}</td><td>${fmt(result.swebrec[index]?.passing ?? row.passing)}</td></tr>`).join('') : '<tr><td colspan="4" class="table-empty">A leitura aparecerá aqui</td></tr>';
}

function renderResult() { renderMetrics(); renderTable(); drawMap(); requestAnimationFrame(drawChart); }

function setImage(image, name, url) {
  state.image = image; state.imageName = name; state.imageUrl = url; state.naturalWidth = image.naturalWidth; state.naturalHeight = image.naturalHeight;
  const ratio = Math.min(1, DISPLAY_LIMIT / Math.max(image.naturalWidth, image.naturalHeight)); state.displayWidth = Math.round(image.naturalWidth * ratio); state.displayHeight = Math.round(image.naturalHeight * ratio);
  const canvas = el('#map-canvas'); canvas.width = state.displayWidth; canvas.height = state.displayHeight; canvas.style.aspectRatio = `${state.displayWidth} / ${state.displayHeight}`; el('#map-empty').hidden = true; el('#file-name').textContent = name; el('#image-resolution').textContent = `${image.naturalWidth} × ${image.naturalHeight}px`; state.roi = defaultRoi(state.displayWidth, state.displayHeight); state.message = 'Ortofoto carregada · pronta para leitura'; el('#map-label').textContent = name.replace(/\.(tif|tiff)$/i, '') + ' · vista geral'; el('#session-name').textContent = name.replace(/\.(tif|tiff)$/i, ''); el('#session-detail').textContent = 'Área de demonstração · leitura local'; runAnalysis();
}

function loadUrl(url, name) { const image = new Image(); image.onload = () => setImage(image, name, url); image.onerror = () => showToast('Não foi possível carregar a ortofoto.'); image.src = url; }
function runAnalysis() { if (!state.image || state.roi.length < 3) { state.result = null; renderResult(); return; } state.loading = true; el('#analysis-status').innerHTML = '<i class="busy"></i> processando imagem'; setTimeout(() => { try { const ctx = document.createElement('canvas').getContext('2d'); ctx.canvas.width = state.displayWidth; ctx.canvas.height = state.displayHeight; ctx.drawImage(state.image, 0, 0, state.displayWidth, state.displayHeight); state.result = analyzePixels(ctx.getImageData(0, 0, state.displayWidth, state.displayHeight).data, state.displayWidth, state.displayHeight, state.roi, Number(state.scaleMm) || 50, state.quality); el('#analysis-status').innerHTML = '<i></i> análise concluída'; el('#map-hint').textContent = `${fmt(state.result.roiAreaM2, 0)} m² avaliados · ${fmtInt(state.result.sampleCount)} amostras`; state.loading = false; renderResult(); } catch (error) { state.loading = false; el('#analysis-status').innerHTML = '<i class="error"></i> ajuste a área'; showToast(error.message); } }, 80); }

function toggleDrawing(force) { state.roiMode = typeof force === 'boolean' ? force : !state.roiMode; el('#draw-button').classList.toggle('is-active', state.roiMode); el('#draw-button').textContent = state.roiMode ? '✓ Finalizar área' : '＋ Desenhar área na imagem'; el('#draw-tip').classList.toggle('is-visible', state.roiMode); el('#map-stage').classList.toggle('is-drawing', state.roiMode); if (state.roiMode) { state.roi = []; state.result = null; renderResult(); } }
function finishDrawing() { if (state.roi.length >= 3) { toggleDrawing(false); el('#roi-status').innerHTML = '<span class="status-icon status-icon--ok">✓</span><span>Área personalizada aplicada</span>'; runAnalysis(); } else showToast('Marque pelo menos três vértices.'); }

function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
function exportCsv() { if (!state.result) return showToast('Execute uma leitura antes de exportar.'); const lines = ['Sieve size (mm),Actual (%),Kuz-Ram (%),Swebrec (%)', ...state.result.real.map((row, index) => `${row.size},${row.passing.toFixed(2)},${state.result.kuzRam[index].passing.toFixed(2)},${state.result.swebrec[index].passing.toFixed(2)}`)]; downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), 'fragmentation-ai-distribuicao.csv'); showToast('CSV exportado.'); }
function report() { if (!state.result) return showToast('Execute uma leitura antes de gerar o relatório.'); document.body.classList.add('print-report'); setTimeout(() => { window.print(); document.body.classList.remove('print-report'); }, 30); }
function showToast(message) { const toast = el('#toast'); toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3000); }

function bindEvents() {
  const input = el('#image-input'); const dropzone = el('#dropzone'); const readFile = (file) => { if (!file) return; if (!file.type.startsWith('image/') && !/\.(tif|tiff)$/i.test(file.name)) return showToast('Selecione uma imagem PNG, JPG, WEBP ou TIFF.'); if (/\.(tif|tiff)$/i.test(file.name)) { const reader = new FileReader(); reader.onload = () => { try { const ifds = UTIF.decode(reader.result); if (!ifds.length) throw new Error('TIFF sem páginas legíveis.'); UTIF.decodeImage(reader.result, ifds[0]); const rgba = UTIF.toRGBA8(ifds[0]); const canvas = document.createElement('canvas'); canvas.width = ifds[0].width; canvas.height = ifds[0].height; canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height), 0, 0); canvas.toBlob((blob) => loadUrl(URL.createObjectURL(blob), file.name), 'image/png'); } catch (error) { showToast(error.message || 'Não foi possível ler o TIFF.'); } }; reader.readAsArrayBuffer(file); return; } const url = URL.createObjectURL(file); loadUrl(url, file.name); };
  dropzone.addEventListener('click', () => input.click()); dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') input.click(); }); input.addEventListener('change', () => readFile(input.files[0])); ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); })); ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); })); dropzone.addEventListener('drop', (event) => readFile(event.dataTransfer.files[0]));
  el('#sample-button').addEventListener('click', () => loadUrl(DEMO_IMAGE, '20260825_Mina_Reduzida.tif')); el('#draw-button').addEventListener('click', () => state.roiMode ? finishDrawing() : toggleDrawing(true)); el('#clear-roi').addEventListener('click', () => { state.roi = []; state.result = null; el('#roi-status').innerHTML = '<span class="status-icon">⌖</span><span>Nenhuma área demarcada</span>'; renderResult(); });
  el('#map-canvas').addEventListener('click', (event) => { if (!state.roiMode) return; state.roi.push(imagePointFromEvent(event)); drawMap(); }); el('#map-canvas').addEventListener('dblclick', (event) => { event.preventDefault(); if (state.roiMode) { const point = imagePointFromEvent(event); state.roi.push(point); finishDrawing(); } }); document.addEventListener('keydown', (event) => { if (event.key === 'Enter' && state.roiMode) finishDrawing(); if (event.key === 'Escape' && state.roiMode) toggleDrawing(false); });
  el('#scale-input').addEventListener('input', (event) => { state.scaleMm = Number(event.target.value) || 50; el('#pixel-scale').textContent = `${state.scaleMm} mm/pixel`; if (state.image && !state.loading) runAnalysis(); }); el('#quality-input').addEventListener('change', (event) => { state.quality = event.target.value; if (state.image) runAnalysis(); }); el('#overlay-toggle').addEventListener('change', (event) => { state.showOverlay = event.target.checked; drawMap(); }); el('#marker-toggle').addEventListener('change', (event) => { state.showMarkers = event.target.checked; drawMap(); }); el('#contour-toggle').addEventListener('change', (event) => { state.showContour = event.target.checked; drawMap(); }); el('#analyze-button').addEventListener('click', runAnalysis); el('#csv-button').addEventListener('click', exportCsv); el('#report-button').addEventListener('click', report); el('#reset-button').addEventListener('click', () => { state.scaleMm = 50; state.quality = 'Equilibrado'; el('#scale-input').value = 50; el('#quality-input').value = 'Equilibrado'; loadUrl(DEMO_IMAGE, '20260825_Mina_Reduzida.tif'); showToast('Análise de demonstração restaurada.'); });
  const dialog = el('#help-dialog'); el('#help-button').addEventListener('click', () => dialog.showModal()); el('#dialog-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }); window.addEventListener('resize', () => { drawMap(); drawChart(); });
}

document.querySelector('#app').innerHTML = appTemplate(); bindEvents(); renderResult(); loadUrl(DEMO_IMAGE, '20260825_Mina_Reduzida.tif');
