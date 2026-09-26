// Art workbench: draws Pip and Minty through the production renderer and
// measures their source pixels. Local tool only: it is not in sw.js and never
// reads or writes saved progress.
import {petArt, bounceCompanion} from './companion-view.js';

const SHEET = './art/triceratops-sprite-sheet.png';
const FRAME_MAP = './art/triceratops-sprite-sheet.json';
const PIP_FILES = ['egg', 'hatching', 'chick'];
const PREFS_KEY = 'art-workbench.view';
const STAGES = [
  {key: 'egg-0', title: 'Egg', rule: '0 of 4 rewards', warmth: 0, xp: 0},
  {key: 'egg-1', title: 'Egg', rule: '1 of 4 rewards', warmth: 1, xp: 0},
  {key: 'egg-2', title: 'Egg', rule: '2 of 4 rewards', warmth: 2, xp: 0},
  {key: 'egg-3', title: 'Egg', rule: '3 of 4 rewards', warmth: 3, xp: 0},
  {key: 'hatch', title: 'Hatched', rule: '4th reward, 0 feeds', warmth: 4, xp: 0},
  {key: 'level-1', title: 'Level 1', rule: '1 feed', warmth: 4, xp: 1},
  {key: 'level-2', title: 'Level 2', rule: '3 feeds', warmth: 4, xp: 3},
  {key: 'level-3', title: 'Level 3', rule: '6 feeds', warmth: 4, xp: 6},
  {key: 'level-4', title: 'Level 4', rule: '9 feeds', warmth: 4, xp: 9},
  {key: 'level-5', title: 'Level 5', rule: '12 feeds (max)', warmth: 4, xp: 12},
];

const strip = document.getElementById('strip');
const contexts = document.getElementById('contexts');
const stageSelect = document.getElementById('stage-select');
const overrides = {pip: null, minty: null};
const metrics = {pip: {}, minty: {}};
let frameNames = {};
let size = 192;
let heroShadow = null;
let renderId = 0;

// Same derivation as replay() in collection.js.
function pet(id, stage) {
  const hatched = stage.warmth === 4;
  return {
    id, name: id === 'pip' ? 'Pip' : 'Minty', species: id === 'pip' ? 'Chick' : 'Triceratops',
    warmth: stage.warmth, xp: stage.xp, hatched,
    level: Math.min(5, 1 + Math.floor((stage.xp + 1e-8) / 3)), growth: stage.xp / 12,
  };
}

// A preview sheet sends Pip down the sprite-sheet path, like Minty.
function art(id, stage) {
  const p = pet(id, stage);
  return petArt(id === 'pip' && overrides.pip ? {...p, id: 'pip-sheet'} : p);
}

// Mirrors the roster tile markup in companionsPage() (companion-view.js).
function tile(id, stage) {
  const p = pet(id, stage);
  const icon = id === 'pip' && !overrides.pip
    ? `<img src="./art/${p.hatched ? 'chick' : 'egg'}.png" alt="">`
    : `<span class="atlas-frame" style="--sprite-x:${p.hatched ? (p.xp === 0 ? 100 : (p.level - 1) * 25) : p.warmth * 25}%;--sprite-y:${p.hatched && p.xp > 0 ? 100 : 0}%"></span>`;
  return `<div class="pet-tile ${p.hatched ? '' : 'unhatched'}" data-pet="${id}"><span class="pet-tile-icon" aria-hidden="true">${icon}</span><strong>${p.name}</strong><small>${p.hatched ? `Level ${p.level} · ${p.species}` : `Egg · ${p.warmth}/4`}</small></div>`;
}

function applyOverrides(root) {
  for (const id of ['pip', 'minty']) {
    if (!overrides[id]) continue;
    root.querySelectorAll(`[data-pet="${id}"] .atlas-frame`).forEach(frame => { frame.style.backgroundImage = `url("${overrides[id].url}")`; });
  }
}

// ---- Pixels -------------------------------------------------------------

const images = new Map();
const boundsCache = new Map();

function loadImage(src) {
  if (!images.has(src)) images.set(src, new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  }));
  return images.get(src);
}

function grow(box, x, y) {
  if (x < box[0]) box[0] = x;
  if (y < box[1]) box[1] = y;
  if (x > box[2]) box[2] = x;
  if (y > box[3]) box[3] = y;
}

// Bounds of one cell as fractions of that cell: solid pixels (alpha >= 200) and
// anything visible (alpha >= 24, which includes soft painted shadows).
function bounds(src, col = 0, row = 0, cols = 1, rows = 1) {
  const key = `${src}|${col}|${row}|${cols}|${rows}`;
  if (!boundsCache.has(key)) boundsCache.set(key, loadImage(src).then(img => {
    const cellW = img.naturalWidth / cols, cellH = img.naturalHeight / rows;
    const sx = Math.round(col * cellW), sy = Math.round(row * cellH);
    const w = Math.round((col + 1) * cellW) - sx, h = Math.round((row + 1) * cellH) - sy;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const solid = [w, h, -1, -1], soft = [w, h, -1, -1];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a >= 24) grow(soft, x, y);
      if (a >= 200) grow(solid, x, y);
    }
    const norm = b => b[2] < 0 ? null : {x0: b[0] / w, y0: b[1] / h, x1: (b[2] + 1) / w, y1: (b[3] + 1) / h};
    return {solid: norm(solid), soft: norm(soft), cellW, cellH, width: img.naturalWidth, height: img.naturalHeight};
  }));
  return boundsCache.get(key);
}

// Which source pixels a rendered companion uses, read back from the DOM so the
// captions always describe what companion-view.js actually produced.
function source(host) {
  const img = host.querySelector('.companion-sprite img');
  if (img) {
    const scale = host.querySelector('.companion-art').classList.contains('is-chick')
      ? Number(host.querySelector('.companion-sprite').style.getPropertyValue('--chick-scale')) : 1;
    const cracks = host.querySelectorAll('.egg-cracks path').length / 2;
    const file = img.getAttribute('src').split('/').pop();
    return {src: img.src, col: 0, row: 0, cols: 1, rows: 1, el: img,
      label: file + (cracks ? ` + ${cracks}/9 cracks` : '') + (scale !== 1 ? ` × ${scale.toFixed(2)}` : '')};
  }
  const frame = host.querySelector('.atlas-frame');
  const col = Math.round(parseFloat(frame.style.getPropertyValue('--sprite-x')) / 25);
  const row = Math.round(parseFloat(frame.style.getPropertyValue('--sprite-y')) / 100);
  const override = overrides[host.dataset.pet];
  return {src: new URL(override?.url || SHEET, location.href).href, col, row, cols: 5, rows: 2, el: frame,
    label: `${override ? 'preview' : 'sheet'} · ${frameNames[`${col},${row}`] || `col ${col + 1}, row ${row + 1}`}`};
}

// The drawn square inside an element. The <img> uses object-fit: contain, and
// .atlas-frame is already square. The rect includes the CSS growth scale.
function drawnSquare(el) {
  const r = el.getBoundingClientRect(), side = Math.min(r.width, r.height);
  return {left: r.left + (r.width - side) / 2, top: r.top + (r.height - side) / 2, side};
}

async function measure(host) {
  const src = source(host);
  const b = await bounds(src.src, src.col, src.row, src.cols, src.rows);
  const sq = drawnSquare(src.el), box = host.getBoundingClientRect(), artRect = host.querySelector('.companion-art').getBoundingClientRect();
  const place = n => n && {left: sq.left - box.left + n.x0 * sq.side, top: sq.top - box.top + n.y0 * sq.side, width: (n.x1 - n.x0) * sq.side, height: (n.y1 - n.y0) * sq.side};
  const art = {left: artRect.left - box.left, top: artRect.top - box.top, width: artRect.width, height: artRect.height};
  const solid = place(b.solid), soft = place(b.soft);
  return {src, b, sq, art, solid, soft,
    summary: solid && {
      width: solid.width, height: solid.height,
      feet: art.top + art.height - (solid.top + solid.height),
      sharp: b.cellW / (sq.side * 3),
    }};
}

function drawGuides(host, m) {
  const px = r => `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  host.querySelector('.wb-guides').innerHTML = `<div class="g-frame" style="${px(m.art)}"></div>`
    + (m.soft ? `<div class="g-soft" style="${px(m.soft)}"></div>` : '')
    + (m.solid ? `<div class="g-solid" style="${px(m.solid)}"></div><div class="g-feet" style="left:${m.art.left}px;width:${m.art.width}px;top:${m.solid.top + m.solid.height}px"></div>` : '');
}

// ---- Views --------------------------------------------------------------

function renderStrip() {
  const kind = id => overrides[id] ? 'preview sheet' : id === 'pip' ? '3 PNGs + code' : 'sprite sheet';
  strip.innerHTML = `<div class="wb-corner"></div>`
    + STAGES.map(s => `<div class="wb-colhead"><b>${s.title}</b><span>${s.rule}</span></div>`).join('')
    + ['pip', 'minty'].map(id => `<div class="wb-rowhead"><b>${id === 'pip' ? 'Pip' : 'Minty'}</b><small>${kind(id)}</small></div>`
      + STAGES.map(s => `<div class="wb-cell"><div class="wb-stage" data-pet="${id}" data-stage="${s.key}">${art(id, s)}<div class="wb-guides"></div></div><div class="wb-cap"></div></div>`).join('')).join('');
}

async function measureStrip(id) {
  const hosts = [...strip.querySelectorAll('.wb-stage')];
  const results = await Promise.all(hosts.map(host => measure(host).catch(() => null)));
  if (id !== renderId) return false;
  hosts.forEach((host, i) => {
    const m = results[i];
    host.nextElementSibling.textContent = m ? m.src.label : 'Could not read image';
    if (!m) return;
    drawGuides(host, m);
    metrics[host.dataset.pet][host.dataset.stage] = m.summary;
  });
  return true;
}

const CONTEXTS = [
  {key: 'today', title: 'Today card', note: 'Top of Today. Shows Pip’s egg until it hatches, then the selected companion.'},
  {key: 'hero', title: 'Companions home', note: 'The large art at the top of the Companions tab, which only appears after Pip hatches.'},
  {key: 'tile', title: 'Roster tile', note: 'The “Your companions” list. Eggs are shown in grey.'},
];

function renderContexts() {
  const s = STAGES.find(x => x.key === stageSelect.value) || STAGES[6];
  contexts.innerHTML = CONTEXTS.map(c => `<div class="wb-context" data-context="${c.key}"><div><h3>${c.title}</h3><p>${c.note}</p><div class="wb-size"></div></div><div class="wb-pair">${
    c.key === 'tile'
      ? `<div class="pet-roster">${tile('pip', s)}${tile('minty', s)}</div>`
      : ['pip', 'minty'].map(id => `<div class="companion-card${c.key === 'hero' ? ' home-hero' : ''}" data-pet="${id}">${art(id, s)}</div>`).join('')
  }</div></div>`).join('');
}

function shadowOffset(host) {
  const ground = host?.querySelector('.companion-ground');
  if (!ground) return null;
  const g = ground.getBoundingClientRect(), a = host.querySelector('.companion-art').getBoundingClientRect();
  return (g.left + g.width / 2) - (a.left + a.width / 2);
}

function annotateContexts() {
  heroShadow = null;
  for (const el of contexts.querySelectorAll('[data-context]')) {
    const out = el.querySelector('.wb-size');
    if (el.dataset.context === 'tile') {
      const r = el.querySelector('.pet-tile-icon').getBoundingClientRect();
      out.textContent = `Icon ${Math.round(r.width)} × ${Math.round(r.height)} px`;
      continue;
    }
    const a = el.querySelector('.companion-art').getBoundingClientRect();
    const off = shadowOffset(el.querySelector('[data-pet="pip"]'));
    const shifted = off !== null && Math.abs(off) > 1.5;
    out.textContent = `Art box ${Math.round(a.width)} × ${Math.round(a.height)} px at this width`
      + (shifted ? ` · Pip’s shadow is ${Math.round(Math.abs(off))} px ${off < 0 ? 'left' : 'right'} of centre` : '');
    if (el.dataset.context === 'hero' && shifted) heroShadow = off;
  }
}

function renderTable() {
  const n = v => Math.round(v);
  const pct = v => `${Math.round(Math.min(1, v) * 100)}%`;
  const cells = (m, feetFlag) => m
    ? `<td class="sep">${n(m.width)} × ${n(m.height)}</td><td class="${feetFlag ? 'flag' : ''}">${n(m.feet)}</td><td class="${m.sharp < .6 ? 'flag' : ''}">${pct(m.sharp)}</td>`
    : '<td class="sep">–</td><td>–</td><td>–</td>';
  const rows = STAGES.map(s => {
    const p = metrics.pip[s.key], m = metrics.minty[s.key];
    const ratio = p && m ? m.height / p.height : null;
    const feetFlag = p && m && Math.abs(m.feet - p.feet) > size * .06;
    return `<tr><td>${s.title} <span style="color:var(--muted)">· ${s.rule}</span></td>${cells(p, feetFlag)}${cells(m, feetFlag)}<td class="sep ${ratio && (ratio < .85 || ratio > 1.18) ? 'flag' : ''}">${ratio ? ratio.toFixed(2) + '×' : '–'}</td></tr>`;
  }).join('');
  document.getElementById('table').innerHTML = `<table class="wb-table"><thead>
    <tr><th></th><th class="grp sep" colspan="3">Pip</th><th class="grp sep" colspan="3">Minty</th><th class="sep"></th></tr>
    <tr><th>Stage</th><th class="sep">Solid size (px)</th><th>Feet (px)</th><th>Sharpness</th><th class="sep">Solid size (px)</th><th>Feet (px)</th><th>Sharpness</th><th class="sep">Minty ÷ Pip height</th></tr>
    </thead><tbody>${rows}</tbody></table>`;
  document.querySelectorAll('[data-fill="size"]').forEach(el => { el.textContent = size; });
}

async function renderSources(id) {
  const pipPanel = document.getElementById('pip-files'), sheetPanel = document.getElementById('minty-sheet');
  const sheetFigure = async (src) => {
    const all = await Promise.all(Array.from({length: 10}, (_, i) => bounds(src, i % 5, Math.floor(i / 5), 5, 2)));
    const names = Array.from({length: 10}, (_, i) => frameNames[`${i % 5},${Math.floor(i / 5)}`] || `${i % 5},${Math.floor(i / 5)}`);
    const boxes = all.map((b, i) => {
      const col = i % 5, row = Math.floor(i / 5), pos = (n, cls) => n ? `<div class="${cls}" style="left:${(col + n.x0) / 5 * 100}%;top:${(row + n.y0) / 2 * 100}%;width:${(n.x1 - n.x0) / 5 * 100}%;height:${(n.y1 - n.y0) / 2 * 100}%"></div>` : '';
      return pos(b.soft, 'g-soft') + pos(b.solid, 'g-solid');
    }).join('');
    return {html: `<img src="${src}" alt=""><div class="wb-bounds">${boxes}</div><div class="wb-cells">${names.map(name => `<div><span>${name}</span></div>`).join('')}</div>`, meta: all[0]};
  };

  if (overrides.pip) {
    const fig = await sheetFigure(overrides.pip.url);
    if (id !== renderId) return;
    pipPanel.innerHTML = `<figure class="wb-file" style="grid-column:1/-1"><div class="wb-sheet" style="margin:0">${fig.html}</div><figcaption>${overrides.pip.name} · ${fig.meta.width} × ${fig.meta.height} (preview)</figcaption></figure>`;
  } else {
    const all = await Promise.all(PIP_FILES.map(name => bounds(new URL(`./art/${name}.png`, location.href).href)));
    if (id !== renderId) return;
    const pos = (n, cls) => n ? `<div class="${cls}" style="left:${n.x0 * 100}%;top:${n.y0 * 100}%;width:${(n.x1 - n.x0) * 100}%;height:${(n.y1 - n.y0) * 100}%"></div>` : '';
    pipPanel.innerHTML = PIP_FILES.map((name, i) => `<figure class="wb-file"><div class="pic"><img src="./art/${name}.png" alt=""><div class="wb-bounds">${pos(all[i].soft, 'g-soft')}${pos(all[i].solid, 'g-solid')}</div></div><figcaption>${name}.png · ${all[i].width} × ${all[i].height}</figcaption></figure>`).join('');
  }

  const fig = await sheetFigure(new URL(overrides.minty?.url || SHEET, location.href).href);
  if (id !== renderId) return;
  sheetPanel.innerHTML = fig.html;
  const m = fig.meta, dims = `${m.width} × ${m.height}`, cell = `${+m.cellW.toFixed(1)} × ${+m.cellH.toFixed(1)}`;
  document.getElementById('sheet-meta').textContent = `${overrides.minty ? `${overrides.minty.name} (preview)` : 'one sprite sheet'} · ${dims} · cells ${cell}`;
  if (!overrides.minty) {
    document.querySelectorAll('[data-fill="sheet-dims"]').forEach(el => { el.textContent = dims; });
    document.querySelectorAll('[data-fill="cell-dims"]').forEach(el => { el.textContent = cell; });
  }
}

// Notes that depend on measurements are only listed when the numbers support them.
async function renderIssues() {
  const px = v => Math.round(v);
  const pct = v => `${Math.round(Math.min(1, v) * 100)}%`;
  const pip = metrics.pip, minty = metrics.minty;
  const sheet = await bounds(new URL(overrides.minty?.url || SHEET, location.href).href, 0, 0, 5, 2);
  const list = [
    {about: 'both', title: 'Two art styles side by side', text: 'Pip is glossy 3D with no outline. Minty is a flat sticker with a thick plum outline. In the roster they look like they come from different apps.'},
    {about: 'pip', title: 'Growth doesn’t feel the same', text: 'Each feed makes Pip slightly bigger (3% of full size), which is easy to miss. Minty changes clearly, but only at a new level, so 2 of every 3 feeds show no change.',
      fact: pip['level-1'] && pip['level-2'] && `At ${size} px, Pip grows from ${px(pip['level-1'].height)} to ${px(pip['level-2'].height)} px tall between level 1 and level 2.`},
  ];
  const shrinks = [['Pip', pip], ['Minty', minty]].filter(([, m]) => m.hatch && m['level-1'] && m['level-1'].height < m.hatch.height * .95);
  if (shrinks.length) list.push({
    title: `${shrinks.length === 2 ? 'Both shrink' : `${shrinks[0][0]} shrinks`} on the first feed`,
    text: 'The hatch picture is drawn larger than level 1, so the companion gets smaller the moment you first feed it.'
      + (!overrides.pip && shrinks.some(([name]) => name === 'Pip') ? ' Pip goes from hatching.png at 88% to chick.png at 65%.' : '')
      + (!overrides.minty && shrinks.some(([name]) => name === 'Minty') ? ' Minty’s hatch frame has a bigger head than its level-1 frame.' : ''),
    fact: `At ${size} px: ${shrinks.map(([name, m]) => `${name} ${px(m.hatch.height)} → ${px(m['level-1'].height)} px tall`).join(', ')}.`});
  list.push({about: 'both', title: 'The eggs don’t look related', text: 'Pip’s egg is the tan Fluent egg with thin cracks drawn in code. Minty’s eggs are cream and mint, with cracks and a glow painted in and the frill peeking out at stage 3.'});
  if (!overrides.pip && heroShadow !== null) list.push({
    title: 'Pip’s shadow is off-centre in Companions', text: '.companion-ground uses fixed pixel positions tuned for the Today art. The Companions hero draws the art larger but keeps those positions.',
    fact: `At this window width, the shadow sits ${px(Math.abs(heroShadow))} px ${heroShadow < 0 ? 'left' : 'right'} of Pip’s centre.`});
  // Full-grown frames are drawn at full size, so they show the worst case.
  const grown = [pip['level-5'], minty['level-5']];
  if (grown.every(Boolean) && grown.some(m => m.sharp < .9)) list.push({
    title: 'Soft on iPhone', text: `A 3× screen needs three source pixels per CSS pixel: ${size * 3} px across for a ${size} px frame.`,
    fact: `At ${size} px, Pip’s ${overrides.pip ? 'preview' : '256 px'} source gives ${pct(grown[0].sharp)} and Minty’s ${+sheet.cellW.toFixed(1)} px cells give ${pct(grown[1].sharp)}. 640 px cells stay sharp up to 213 px.`});
  list.push(
    {about: 'pip', title: 'Pip’s roster tile ignores progress', text: 'The tile always shows chick.png at full size, whatever the level. Minty’s tile shows its current frame.'},
    {about: 'pip', title: 'Size rules are hand-tuned', text: 'The .egg-cracks height and .companion-ground position are set in pixels for each layout in styles.css, so every new size needs matching rules. The sprite sheet scales with its box.'},
  );
  if (!Number.isInteger(sheet.cellW) || !Number.isInteger(sheet.cellH)) list.push({
    title: 'Sheet cells aren’t whole pixels', text: `${sheet.width} ÷ 5 = ${+sheet.cellW.toFixed(1)} and ${sheet.height} ÷ 2 = ${+sheet.cellH.toFixed(1)}. The app copes because it positions frames in percentages, but slicing tools will be a pixel off. Export future sheets with whole-number cells, such as 5 × 640 by 2 × 640.`});
  // Notes marked `about` describe the current files, so a preview hides them.
  const current = i => !i.about || (!overrides.pip && (i.about === 'pip' || !overrides.minty));
  const previewing = overrides.pip || overrides.minty;
  document.getElementById('issues').innerHTML = (previewing ? '<p class="wb-lede" style="grid-column:1/-1;margin:0">A preview is loaded. Notes about the files it replaces are hidden.</p>' : '')
    + list.filter(current).map(i => `<div class="wb-issue"><h3>${i.title}</h3><p>${i.text}</p>${i.fact ? `<p class="fact">${i.fact}</p>` : ''}</div>`).join('');
}

async function renderAll() {
  const id = ++renderId;
  document.body.style.setProperty('--s', `${size}px`);
  metrics.pip = {};
  metrics.minty = {};
  renderStrip();
  renderContexts();
  applyOverrides(document);
  annotateContexts();
  if (!await measureStrip(id)) return;
  renderTable();
  await renderIssues();
  await renderSources(id);
}

// ---- Controls -----------------------------------------------------------

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({bg: document.body.dataset.bg, size, guides: document.body.classList.contains('show-guides'), stage: stageSelect.value})); } catch {}
}

function setupControls(prefs) {
  const pressed = (group, value) => group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  const bgGroup = document.querySelector('[data-control="bg"]'), sizeGroup = document.querySelector('[data-control="size"]');
  const guides = document.getElementById('guides');

  if (['card', 'white', 'dark', 'checker'].includes(prefs.bg)) document.body.dataset.bg = prefs.bg;
  if ([96, 170, 192, 224, 320].includes(prefs.size)) size = prefs.size;
  if (prefs.guides === false) { guides.checked = false; document.body.classList.remove('show-guides'); }
  stageSelect.innerHTML = STAGES.map(s => `<option value="${s.key}">${s.title} · ${s.rule}</option>`).join('');
  stageSelect.value = STAGES.some(s => s.key === prefs.stage) ? prefs.stage : 'level-2';
  pressed(bgGroup, document.body.dataset.bg);
  pressed(sizeGroup, String(size));

  bgGroup.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    document.body.dataset.bg = b.dataset.value;
    pressed(bgGroup, b.dataset.value);
    savePrefs();
  });
  sizeGroup.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    size = Number(b.dataset.value);
    pressed(sizeGroup, b.dataset.value);
    savePrefs();
    renderAll();
  });
  guides.addEventListener('change', () => { document.body.classList.toggle('show-guides', guides.checked); savePrefs(); });
  stageSelect.addEventListener('change', () => { renderContexts(); applyOverrides(contexts); annotateContexts(); savePrefs(); });

  document.addEventListener('click', e => {
    const button = e.target.closest('[data-bounce]');
    if (button) bounceCompanion(button);
  });
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderAll, 150); });
}

function setupDrops() {
  // A file dropped outside a drop zone would otherwise replace this page.
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => e.preventDefault());
  for (const zone of document.querySelectorAll('[data-drop]')) {
    const id = zone.dataset.drop, input = zone.querySelector('input'), reset = zone.querySelector('[data-reset]'), status = zone.querySelector('.status');
    const use = async file => {
      if (!file || !file.type.startsWith('image/')) { status.textContent = 'That isn’t an image file.'; return; }
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        if (overrides[id]) URL.revokeObjectURL(overrides[id].url);
        overrides[id] = {url, name: file.name};
        const ratio = img.naturalWidth / img.naturalHeight;
        status.textContent = `Previewing ${file.name} · ${img.naturalWidth} × ${img.naturalHeight}${Math.abs(ratio - 2.5) > .05 ? ' · not 5 × 2 square cells (expected 2.5 : 1)' : ''}`;
        status.classList.add('on');
        reset.hidden = false;
        renderAll();
      } catch {
        URL.revokeObjectURL(url);
        status.textContent = 'Could not read that image.';
      }
      input.value = '';
    };
    input.addEventListener('change', () => use(input.files[0]));
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('over'); use(e.dataTransfer.files[0]); });
    reset.addEventListener('click', () => {
      URL.revokeObjectURL(overrides[id].url);
      overrides[id] = null;
      status.textContent = 'or drop a file here';
      status.classList.remove('on');
      reset.hidden = true;
      renderAll();
    });
  }
}

try {
  const map = await (await fetch(FRAME_MAP)).json();
  frameNames = Object.fromEntries(Object.entries(map.frames).map(([name, f]) => [`${f.x},${f.y}`, name]));
} catch { /* Captions fall back to grid positions. */ }
setupControls(loadPrefs());
setupDrops();
renderAll();
