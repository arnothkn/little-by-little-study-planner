// Art workbench: draws every companion in SPECIES through the production
// renderer and measures their source pixels. Local tool only: it is not in
// sw.js and never reads or writes saved progress.
import { petArt, atlasFrame, bounceCompanion } from './companion-view.js';
import { SPECIES } from './collection.js';

const IDS = Object.keys(SPECIES); // Pip comes first and is the reference for comparisons.
const FRAME_MAP = './art/pip-sprite-sheet.json'; // Every sheet shares this layout.
const PREFS_KEY = 'art-workbench.view';
const STAGES = [
  { key: 'egg-0', title: 'Egg', rule: '0 of 4 rewards', warmth: 0, xp: 0 },
  { key: 'egg-1', title: 'Egg', rule: '1 of 4 rewards', warmth: 1, xp: 0 },
  { key: 'egg-2', title: 'Egg', rule: '2 of 4 rewards', warmth: 2, xp: 0 },
  { key: 'egg-3', title: 'Egg', rule: '3 of 4 rewards', warmth: 3, xp: 0 },
  { key: 'hatch', title: 'Hatched', rule: '4th reward, 0 feeds', warmth: 4, xp: 0 },
  { key: 'level-1', title: 'Level 1', rule: '1 feed', warmth: 4, xp: 1 },
  { key: 'level-2', title: 'Level 2', rule: '3 feeds', warmth: 4, xp: 3 },
  { key: 'level-3', title: 'Level 3', rule: '6 feeds', warmth: 4, xp: 6 },
  { key: 'level-4', title: 'Level 4', rule: '9 feeds', warmth: 4, xp: 9 },
  { key: 'level-5', title: 'Level 5', rule: '12 feeds (max)', warmth: 4, xp: 12 },
];

const strip = document.getElementById('strip');
const contexts = document.getElementById('contexts');
const stageSelect = document.getElementById('stage-select');
const overrides = Object.fromEntries(IDS.map(id => [id, null]));
let metrics = {};
let frameNames = {};
let size = 192;
let renderId = 0;

const name = id => SPECIES[id].name;
// A dropped preview replaces that companion's sheet everywhere on this page.
const sheetUrl = id =>
  new URL(overrides[id]?.url || `./art/${SPECIES[id].sheet}`, location.href).href;

// Same derivation as replay() in collection.js.
function pet(id, stage) {
  const hatched = stage.warmth === 4;
  return {
    id,
    ...SPECIES[id],
    warmth: stage.warmth,
    xp: stage.xp,
    hatched,
    level: Math.min(5, 1 + Math.floor((stage.xp + 1e-8) / 3)),
    growth: stage.xp / 12,
  };
}

function art(id, stage) {
  return petArt(pet(id, stage));
}

// Mirrors the roster tile markup in companionsPage() (companion-view.js).
function tile(id, stage) {
  const p = pet(id, stage);
  return `<div class="pet-tile ${p.hatched ? '' : 'unhatched'}" data-pet="${id}"><span class="pet-tile-icon" aria-hidden="true">${atlasFrame(p)}</span><strong>${p.name}</strong><small>${p.hatched ? `Level ${p.level} · ${p.species}` : `Egg · ${p.warmth}/4`}</small></div>`;
}

function applyOverrides(root) {
  for (const id of IDS) {
    if (!overrides[id]) continue;
    root.querySelectorAll(`[data-pet="${id}"] .atlas-frame`).forEach(frame => {
      frame.style.backgroundImage = `url("${overrides[id].url}")`;
    });
  }
}

// ---- Pixels -------------------------------------------------------------

const images = new Map();
const boundsCache = new Map();

function loadImage(src) {
  if (!images.has(src))
    images.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Could not load ${src}`));
        img.src = src;
      }),
    );
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
  if (!boundsCache.has(key))
    boundsCache.set(
      key,
      loadImage(src).then(img => {
        const cellW = img.naturalWidth / cols,
          cellH = img.naturalHeight / rows;
        const sx = Math.round(col * cellW),
          sy = Math.round(row * cellH);
        const w = Math.round((col + 1) * cellW) - sx,
          h = Math.round((row + 1) * cellH) - sy;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const solid = [w, h, -1, -1],
          soft = [w, h, -1, -1];
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a >= 24) grow(soft, x, y);
            if (a >= 200) grow(solid, x, y);
          }
        const norm = b =>
          b[2] < 0 ? null : { x0: b[0] / w, y0: b[1] / h, x1: (b[2] + 1) / w, y1: (b[3] + 1) / h };
        return {
          solid: norm(solid),
          soft: norm(soft),
          cellW,
          cellH,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      }),
    );
  return boundsCache.get(key);
}

// Which source pixels a rendered companion uses, read back from the DOM so the
// captions always describe what companion-view.js actually produced.
function source(host) {
  const frame = host.querySelector('.atlas-frame');
  const col = Math.round(parseFloat(frame.style.getPropertyValue('--sprite-x')) / 25);
  const row = Math.round(parseFloat(frame.style.getPropertyValue('--sprite-y')) / 100);
  const override = overrides[host.dataset.pet];
  return {
    src: sheetUrl(host.dataset.pet),
    col,
    row,
    cols: 5,
    rows: 2,
    el: frame,
    label: `${override ? 'preview' : 'sheet'} · ${frameNames[`${col},${row}`] || `col ${col + 1}, row ${row + 1}`}`,
  };
}

// The drawn square inside a frame. .atlas-frame is already square.
function drawnSquare(el) {
  const r = el.getBoundingClientRect(),
    side = Math.min(r.width, r.height);
  return { left: r.left + (r.width - side) / 2, top: r.top + (r.height - side) / 2, side };
}

async function measure(host) {
  const src = source(host);
  const b = await bounds(src.src, src.col, src.row, src.cols, src.rows);
  const sq = drawnSquare(src.el),
    box = host.getBoundingClientRect(),
    artRect = host.querySelector('.companion-art').getBoundingClientRect();
  const place = n =>
    n && {
      left: sq.left - box.left + n.x0 * sq.side,
      top: sq.top - box.top + n.y0 * sq.side,
      width: (n.x1 - n.x0) * sq.side,
      height: (n.y1 - n.y0) * sq.side,
    };
  const art = {
    left: artRect.left - box.left,
    top: artRect.top - box.top,
    width: artRect.width,
    height: artRect.height,
  };
  const solid = place(b.solid),
    soft = place(b.soft);
  return {
    src,
    b,
    sq,
    art,
    solid,
    soft,
    summary: solid && {
      width: solid.width,
      height: solid.height,
      feet: art.top + art.height - (solid.top + solid.height),
      sharp: b.cellW / (sq.side * 3),
    },
  };
}

function drawGuides(host, m) {
  const px = r => `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  host.querySelector('.wb-guides').innerHTML =
    `<div class="g-frame" style="${px(m.art)}"></div>` +
    (m.soft ? `<div class="g-soft" style="${px(m.soft)}"></div>` : '') +
    (m.solid
      ? `<div class="g-solid" style="${px(m.solid)}"></div><div class="g-feet" style="left:${m.art.left}px;width:${m.art.width}px;top:${m.solid.top + m.solid.height}px"></div>`
      : '');
}

// ---- Views --------------------------------------------------------------

function renderStrip() {
  const kind = id => (overrides[id] ? 'preview sheet' : 'sprite sheet');
  strip.innerHTML =
    `<div class="wb-corner"></div>` +
    STAGES.map(s => `<div class="wb-colhead"><b>${s.title}</b><span>${s.rule}</span></div>`).join(
      '',
    ) +
    IDS.map(
      id =>
        `<div class="wb-rowhead"><b>${name(id)}</b><small>${kind(id)}</small></div>` +
        STAGES.map(
          s =>
            `<div class="wb-cell"><div class="wb-stage" data-pet="${id}" data-stage="${s.key}">${art(id, s)}<div class="wb-guides"></div></div><div class="wb-cap"></div></div>`,
        ).join(''),
    ).join('');
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
  {
    key: 'today',
    title: 'Today card',
    note: 'Top of Today. Shows Pip’s egg until it hatches, then the selected companion.',
  },
  {
    key: 'hero',
    title: 'Companions home',
    note: 'The large art at the top of the Companions tab, which only appears after Pip hatches.',
  },
  {
    key: 'tile',
    title: 'Roster tile',
    note: 'The “Your companions” list. Eggs are shown in grey.',
  },
];

function renderContexts() {
  const s = STAGES.find(x => x.key === stageSelect.value) || STAGES[6];
  contexts.innerHTML = CONTEXTS.map(
    c =>
      `<div class="wb-context" data-context="${c.key}"><div><h3>${c.title}</h3><p>${c.note}</p><div class="wb-size"></div></div><div class="wb-pair">${
        c.key === 'tile'
          ? `<div class="pet-roster">${IDS.map(id => tile(id, s)).join('')}</div>`
          : IDS.map(
              id =>
                `<div class="companion-card${c.key === 'hero' ? ' home-hero' : ''}" data-pet="${id}">${art(id, s)}</div>`,
            ).join('')
      }</div></div>`,
  ).join('');
}

function annotateContexts() {
  for (const el of contexts.querySelectorAll('[data-context]')) {
    const out = el.querySelector('.wb-size');
    if (el.dataset.context === 'tile') {
      const r = el.querySelector('.pet-tile-icon').getBoundingClientRect();
      out.textContent = `Icon ${Math.round(r.width)} × ${Math.round(r.height)} px`;
      continue;
    }
    const a = el.querySelector('.companion-art').getBoundingClientRect();
    out.textContent = `Art box ${Math.round(a.width)} × ${Math.round(a.height)} px at this width`;
  }
}

function renderTable() {
  const n = v => Math.round(v);
  const pct = v => `${Math.round(Math.min(1, v) * 100)}%`;
  const ref = IDS[0];
  // The others get a height ratio column, and feet or height far from Pip's are flagged.
  const cells = (id, s) => {
    const m = metrics[id][s.key],
      r = metrics[ref][s.key],
      extra = id !== ref;
    if (!m) return '<td class="sep">–</td><td>–</td><td>–</td>' + (extra ? '<td>–</td>' : '');
    const ratio = extra && r ? m.height / r.height : null;
    const feetFlag = extra && r && Math.abs(m.feet - r.feet) > size * 0.06;
    return (
      `<td class="sep">${n(m.width)} × ${n(m.height)}</td><td class="${feetFlag ? 'flag' : ''}">${n(m.feet)}</td><td class="${m.sharp < 0.6 ? 'flag' : ''}">${pct(m.sharp)}</td>` +
      (extra
        ? `<td class="${ratio && (ratio < 0.85 || ratio > 1.18) ? 'flag' : ''}">${ratio ? ratio.toFixed(2) + '×' : '–'}</td>`
        : '')
    );
  };
  const rows = STAGES.map(
    s =>
      `<tr><td>${s.title} <span style="color:var(--muted)">· ${s.rule}</span></td>${IDS.map(id => cells(id, s)).join('')}</tr>`,
  ).join('');
  document.getElementById('table').innerHTML = `<table class="wb-table"><thead>
    <tr><th></th>${IDS.map(id => `<th class="grp sep" colspan="${id === ref ? 3 : 4}">${name(id)}</th>`).join('')}</tr>
    <tr><th>Stage</th>${IDS.map(id => `<th class="sep">Solid size (px)</th><th>Feet (px)</th><th>Sharpness</th>${id === ref ? '' : `<th>÷ ${name(ref)} height</th>`}`).join('')}</tr>
    </thead><tbody>${rows}</tbody></table>`;
  document.querySelectorAll('[data-fill="size"]').forEach(el => {
    el.textContent = size;
  });
}

async function renderSources(id) {
  const sheetFigure = async src => {
    const all = await Promise.all(
      Array.from({ length: 10 }, (_, i) => bounds(src, i % 5, Math.floor(i / 5), 5, 2)),
    );
    const names = Array.from(
      { length: 10 },
      (_, i) => frameNames[`${i % 5},${Math.floor(i / 5)}`] || `${i % 5},${Math.floor(i / 5)}`,
    );
    const boxes = all
      .map((b, i) => {
        const col = i % 5,
          row = Math.floor(i / 5),
          pos = (n, cls) =>
            n
              ? `<div class="${cls}" style="left:${((col + n.x0) / 5) * 100}%;top:${((row + n.y0) / 2) * 100}%;width:${((n.x1 - n.x0) / 5) * 100}%;height:${((n.y1 - n.y0) / 2) * 100}%"></div>`
              : '';
        return pos(b.soft, 'g-soft') + pos(b.solid, 'g-solid');
      })
      .join('');
    return {
      html: `<img src="${src}" alt=""><div class="wb-bounds">${boxes}</div><div class="wb-cells">${names.map(name => `<div><span>${name}</span></div>`).join('')}</div>`,
      meta: all[0],
    };
  };

  const figs = await Promise.all(IDS.map(pet => sheetFigure(sheetUrl(pet))));
  if (id !== renderId) return;
  document.getElementById('sheets').innerHTML = IDS.map((pet, i) => {
    const m = figs[i].meta;
    return `<div class="wb-panel"><h3>${name(pet)} <small>${overrides[pet] ? `${overrides[pet].name} (preview)` : SPECIES[pet].sheet} · ${m.width} × ${m.height} · cells ${+m.cellW.toFixed(1)} × ${+m.cellH.toFixed(1)}</small></h3><div class="wb-sheet">${figs[i].html}</div></div>`;
  }).join('');
}

// Notes that depend on measurements are only listed when the numbers support them.
async function renderIssues() {
  const px = v => Math.round(v);
  const pct = v => `${Math.round(Math.min(1, v) * 100)}%`;
  const ref = IDS[0],
    list = [];
  const cells = await Promise.all(
    IDS.map(id =>
      Promise.all(
        Array.from({ length: 10 }, (_, i) => bounds(sheetUrl(id), i % 5, Math.floor(i / 5), 5, 2)),
      ),
    ),
  );
  // Anything touching its cell's edge is clipped in its own frame and shows as a sliver in the next.
  const touching = IDS.flatMap((id, i) =>
    cells[i].flatMap((b, c) =>
      b.soft && (b.soft.x0 === 0 || b.soft.y0 === 0 || b.soft.x1 === 1 || b.soft.y1 === 1)
        ? [`${name(id)} ${frameNames[`${c % 5},${Math.floor(c / 5)}`] || `cell ${c + 1}`}`]
        : [],
    ),
  );
  if (touching.length)
    list.push({
      title: 'Art touches a cell edge',
      text: 'It gets cut off in its own frame and leaks into the neighbouring one. Every sprite, shadow and shell fragment must stay inside its cell.',
      fact: `Touching: ${touching.join(', ')}.`,
    });
  const shrinks = IDS.filter(
    id =>
      metrics[id].hatch &&
      metrics[id]['level-1'] &&
      metrics[id]['level-1'].height < metrics[id].hatch.height * 0.95,
  );
  if (shrinks.length)
    list.push({
      title: `${shrinks.length === IDS.length ? 'Every companion shrinks' : `${shrinks.map(name).join(' and ')} shrink${shrinks.length === 1 ? 's' : ''}`} on the first feed`,
      text: 'The hatch picture is drawn larger than level 1, so the companion gets smaller the moment you first feed it.',
      fact: `At ${size} px: ${shrinks.map(id => `${name(id)} ${px(metrics[id].hatch.height)} → ${px(metrics[id]['level-1'].height)} px tall`).join(', ')}.`,
    });
  // Feet are measured from the bottom of the art box, so a gap means a companion floats or sinks.
  const drift = IDS.slice(1).flatMap(id =>
    STAGES.filter(
      s =>
        metrics[ref][s.key] &&
        metrics[id][s.key] &&
        Math.abs(metrics[ref][s.key].feet - metrics[id][s.key].feet) > size * 0.06,
    ).map(
      s =>
        `${name(id)} ${s.key} ${px(metrics[id][s.key].feet)} vs ${px(metrics[ref][s.key].feet)} px`,
    ),
  );
  if (drift.length)
    list.push({
      title: 'Feet don’t line up',
      text: `Some painted ground shadows sit higher or lower than ${name(ref)}’s, so switching companions moves the character up or down.`,
      fact: `At ${size} px: ${drift.join(', ')}.`,
    });
  list.push({
    about: 'all',
    title: 'Growth shows only at a new level',
    text: 'Every sheet has five growth frames, so 2 of every 3 feeds show no visible change.',
  });
  // Full-grown frames are drawn at full size, so they show the worst case.
  const grown = IDS.map(id => metrics[id]['level-5']);
  if (grown.every(Boolean) && grown.some(m => m.sharp < 0.9))
    list.push({
      title: 'Soft on iPhone',
      text: `A 3× screen needs three source pixels per CSS pixel: ${size * 3} px across for a ${size} px frame.`,
      fact: `At ${size} px: ${IDS.map((id, i) => `${name(id)}’s ${+cells[i][0].cellW.toFixed(1)} px cells give ${pct(grown[i].sharp)}`).join(', ')}. 640 px cells stay sharp up to 213 px.`,
    });
  const uneven = IDS.filter(
    (id, i) => !Number.isInteger(cells[i][0].cellW) || !Number.isInteger(cells[i][0].cellH),
  );
  if (uneven.length) {
    const u = cells[IDS.indexOf(uneven[0])][0];
    list.push({
      title: 'Sheet cells aren’t whole pixels',
      text: `${uneven.map(name).join(' and ')}: ${u.width} ÷ 5 = ${+u.cellW.toFixed(1)} and ${u.height} ÷ 2 = ${+u.cellH.toFixed(1)}. The app copes because it positions frames in percentages, but slicing tools will be a pixel off. Export future sheets with whole-number cells, such as 5 × 640 by 2 × 640.`,
    });
  }
  // Notes marked `about` describe the current files, so a preview hides them.
  const previewing = IDS.some(id => overrides[id]);
  const current = i => !i.about || !previewing;
  document.getElementById('issues').innerHTML =
    (previewing
      ? '<p class="wb-lede" style="grid-column:1/-1;margin:0">A preview is loaded. Notes about the files it replaces are hidden.</p>'
      : '') +
    list
      .filter(current)
      .map(
        i =>
          `<div class="wb-issue"><h3>${i.title}</h3><p>${i.text}</p>${i.fact ? `<p class="fact">${i.fact}</p>` : ''}</div>`,
      )
      .join('');
}

async function renderAll() {
  const id = ++renderId;
  document.body.style.setProperty('--s', `${size}px`);
  metrics = Object.fromEntries(IDS.map(id => [id, {}]));
  renderStrip();
  renderContexts();
  applyOverrides(document);
  annotateContexts();
  if (!(await measureStrip(id))) return;
  renderTable();
  await renderIssues();
  await renderSources(id);
}

// ---- Controls -----------------------------------------------------------

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}
function savePrefs() {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        bg: document.body.dataset.bg,
        size,
        guides: document.body.classList.contains('show-guides'),
        stage: stageSelect.value,
      }),
    );
  } catch {}
}

function setupControls(prefs) {
  const pressed = (group, value) =>
    group
      .querySelectorAll('button')
      .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  const bgGroup = document.querySelector('[data-control="bg"]'),
    sizeGroup = document.querySelector('[data-control="size"]');
  const guides = document.getElementById('guides');

  if (['card', 'white', 'dark', 'checker'].includes(prefs.bg)) document.body.dataset.bg = prefs.bg;
  if ([96, 170, 192, 224, 320].includes(prefs.size)) size = prefs.size;
  if (prefs.guides === false) {
    guides.checked = false;
    document.body.classList.remove('show-guides');
  }
  stageSelect.innerHTML = STAGES.map(
    s => `<option value="${s.key}">${s.title} · ${s.rule}</option>`,
  ).join('');
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
  guides.addEventListener('change', () => {
    document.body.classList.toggle('show-guides', guides.checked);
    savePrefs();
  });
  stageSelect.addEventListener('change', () => {
    renderContexts();
    applyOverrides(contexts);
    annotateContexts();
    savePrefs();
  });

  document.addEventListener('click', e => {
    const button = e.target.closest('[data-bounce]');
    if (button) bounceCompanion(button);
  });
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 150);
  });
}

function setupDrops() {
  // A file dropped outside a drop zone would otherwise replace this page.
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => e.preventDefault());
  document.getElementById('drops').innerHTML = IDS.map(
    id => `<div class="wb-drop" data-drop="${id}"><h3>Replace ${name(id)}’s sheet</h3><p>Try a regenerated or higher-resolution sheet.</p>
    <div class="row"><label class="btn">Choose PNG…<input type="file" accept="image/png,image/webp"></label><button type="button" data-reset hidden>Reset</button><span class="status">or drop a file here</span></div></div>`,
  ).join('');
  for (const zone of document.querySelectorAll('[data-drop]')) {
    const id = zone.dataset.drop,
      input = zone.querySelector('input'),
      reset = zone.querySelector('[data-reset]'),
      status = zone.querySelector('.status');
    const use = async file => {
      if (!file || !file.type.startsWith('image/')) {
        status.textContent = 'That isn’t an image file.';
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        if (overrides[id]) URL.revokeObjectURL(overrides[id].url);
        overrides[id] = { url, name: file.name };
        const ratio = img.naturalWidth / img.naturalHeight;
        status.textContent = `Previewing ${file.name} · ${img.naturalWidth} × ${img.naturalHeight}${Math.abs(ratio - 2.5) > 0.05 ? ' · not 5 × 2 square cells (expected 2.5 : 1)' : ''}`;
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
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('over');
      use(e.dataTransfer.files[0]);
    });
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
  frameNames = Object.fromEntries(
    Object.entries(map.frames).map(([name, f]) => [`${f.x},${f.y}`, name]),
  );
} catch {
  /* Captions fall back to grid positions. */
}
setupControls(loadPrefs());
setupDrops();
renderAll();
