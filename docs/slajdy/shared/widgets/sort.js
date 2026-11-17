// Sorting step by step: bars with their values, one comparison or one swap per step, live counters.
// The steps follow the code on the slides exactly, so the counters agree with the formulas there.
//
// config: {
//   algo: 'selection'   'selection' | 'bubble' | 'insertion' | 'merge'
//   array: [5,2,8,1,9,3,7,4]
//   width: 520, height: 300
//   presets: false      also show "posortowana" / "odwrócona" buttons (best and worst case)
//   step: 0             step shown in the default state (-1: the end)
//   seed: 1             seeds "losuj"
// }
// Colours: amber = the two elements compared now, violet = swapped now, green = sorted part,
// merge: blue-violet / pink = left / right half being merged, the lower row = the helper vector b.
// Default (and print) state: `array` after `step` steps.
import { C, h, isPrint } from './util.js';

function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every frame: { a, hl, kind: 'cmp'|'swap'|'write'|'copy'|'', done, note, cmp, sw, b, rng: [l, m, r], taken }
function trace(algo, a0) {
  const a = a0.slice(), n = a.length, frames = [];
  let cmp = 0, sw = 0, done = Array(n).fill(false), b = null, rng = null, taken = [];
  const push = (kind, hl, note) => frames.push({
    a: a.slice(), kind, hl, note, cmp, sw, done: done.slice(), b: b && b.slice(), rng: rng && rng.slice(), taken: taken.slice(),
  });
  const swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; sw++; };
  push('', [], 'stan początkowy');

  if (algo === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) {
        cmp++;
        const less = a[j] < a[m];
        push('cmp', [j, m], `a[${j}] = ${a[j]} < a[${m}] = ${a[m]}? ${less ? 'tak: nowe minimum' : 'nie'}`);
        if (less) m = j;
      }
      swap(i, m); done[i] = true;
      push('swap', [i, m], i === m ? `a[${i}] = ${a[i]} już jest na miejscu` : `zamieniamy a[${i}] i a[${m}]`);
    }
  } else if (algo === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j + 1 < n - i; j++) {
        cmp++;
        const gt = a[j] > a[j + 1];
        push('cmp', [j, j + 1], `a[${j}] = ${a[j]} > a[${j + 1}] = ${a[j + 1]}? ${gt ? 'tak' : 'nie'}`);
        if (gt) { swap(j, j + 1); push('swap', [j, j + 1], `zamieniamy a[${j}] i a[${j + 1}]`); }
      }
      done[n - 1 - i] = true;
    }
  } else if (algo === 'insertion') {
    done[0] = true;
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        cmp++;
        const gt = a[j - 1] > a[j];
        push('cmp', [j - 1, j], `a[${j - 1}] = ${a[j - 1]} > a[${j}] = ${a[j]}? ${gt ? 'tak' : 'nie: wstawione'}`);
        if (!gt) break;
        swap(j - 1, j); push('swap', [j - 1, j], `zamieniamy a[${j - 1}] i a[${j}]`);
        j--;
      }
      done[i] = true;
    }
  } else if (algo === 'merge') {
    const rec = (l, r) => {
      if (r - l <= 1) return;
      const m = (l + r) >> 1;
      rec(l, m); rec(m, r);
      b = []; rng = [l, m, r]; taken = [];
      let i = l, j = m;
      const write = (q, note) => { b.push(a[q]); taken.push(q); sw++; push('write', [q], note); };
      while (i < m && j < r) {
        cmp++;
        const le = a[i] <= a[j];
        push('cmp', [i, j], `a[${i}] = ${a[i]} ≤ a[${j}] = ${a[j]}? ${le ? 'tak: bierzemy z lewej' : 'nie: bierzemy z prawej'}`);
        if (le) { write(i, `b.push_back(${a[i]})`); i++; } else { write(j, `b.push_back(${a[j]})`); j++; }
      }
      while (i < m) { write(i, `prawa połowa się skończyła: b.push_back(${a[i]})`); i++; }
      while (j < r) { write(j, `lewa połowa się skończyła: b.push_back(${a[j]})`); j++; }
      for (let q = l; q < r; q++) { a[q] = b[q - l]; done[q] = true; }
      b = null; rng = null; taken = [];
      push('copy', [], `przepisujemy b do a[${l}..${r - 1}]`);
    };
    rec(0, n);
  }
  done.fill(true);
  const last = frames[frames.length - 1];
  last.done = done.slice(); last.note += ' · posortowane';
  return frames;
}

export function mount(el, cfg) {
  const W = cfg.width || 520, H = cfg.height || 300, algo = cfg.algo || 'selection';
  const rand = rng(cfg.seed ?? 1);
  let base = (cfg.array || [5, 2, 8, 1, 9, 3, 7, 4]).slice();
  let frames = trace(algo, base), k = 0, timer = null;
  const startStep = cfg.step ?? 0;
  k = startStep < 0 ? frames.length - 1 : Math.min(startStep, frames.length - 1);

  const canvas = h('canvas', { width: W, height: H });
  const g = canvas.getContext('2d');
  const readout = h('span', { class: 'readout' });
  const note = h('span', { class: 'readout' });

  function draw() {
    const f = frames[k], n = f.a.length, maxV = Math.max(...base, 1);
    g.fillStyle = C.bg2; g.fillRect(0, 0, W, H);
    const merge = algo === 'merge';
    const top = 16, bottomA = merge ? H * 0.6 : H - 30, slot = (W - 40) / n, bw = slot * 0.7;
    const X = i => 20 + i * slot + (slot - bw) / 2;
    const barH = v => 18 + (bottomA - top - 40) * v / maxV;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const v = f.a[i], bh = barH(v);
      let col = f.done[i] ? C.green : '#9188a8';
      if (merge && f.rng) {
        const [l, m, r] = f.rng;
        if (i >= l && i < m) col = C.blue; else if (i >= m && i < r) col = C.purple;
      }
      if (f.hl.includes(i)) col = f.kind === 'swap' ? C.blue : C.accent;
      g.globalAlpha = f.taken.includes(i) && !f.hl.includes(i) ? 0.25 : 1;
      g.fillStyle = col;
      g.beginPath(); g.roundRect(X(i), bottomA - bh, bw, bh, 4); g.fill();
      g.fillStyle = C.bg; g.font = '600 16px Inter, Arial';
      g.fillText(v, X(i) + bw / 2, bottomA - 12);
      g.globalAlpha = 1;
      g.fillStyle = C.dim; g.font = '13px Inter, Arial';
      g.fillText(i, X(i) + bw / 2, bottomA + 13);
    }
    if (f.kind === 'swap' && f.hl[0] !== f.hl[1]) { // a bracket under the swapped pair
      const [p, q] = f.hl.slice().sort((x, y) => x - y), y = bottomA + 26;
      g.strokeStyle = C.blue; g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(p) + bw / 2, y - 4); g.lineTo(X(p) + bw / 2, y); g.lineTo(X(q) + bw / 2, y); g.lineTo(X(q) + bw / 2, y - 4); g.stroke();
    }
    if (merge) {
      const yB = H - 14;
      g.fillStyle = C.dim; g.font = '13px Inter, Arial'; g.textAlign = 'left';
      g.fillText('b:', 6, yB - 30);
      if (f.b) {
        const l = f.rng[0];
        f.b.forEach((v, t) => {
          const bh = (barH(v) - 18) * 0.45 + 14;
          g.fillStyle = t === f.b.length - 1 && f.kind === 'write' ? C.accent : '#9188a8';
          g.beginPath(); g.roundRect(X(l + t), yB - bh, bw, bh, 4); g.fill();
          g.fillStyle = C.bg; g.font = '600 14px Inter, Arial'; g.textAlign = 'center';
          g.fillText(v, X(l + t) + bw / 2, yB - 9);
        });
      }
    }
    g.strokeStyle = '#5f5671'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    readout.innerHTML = `krok ${k}/${frames.length - 1} · porównania: <b style="color:${C.accent}">${f.cmp}</b> · ` +
      (merge ? `zapisy do b: <b>${f.sw}</b>` : `zamiany: <b>${f.sw}</b>`);
    note.textContent = f.note;
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶ odtwarzaj'; } }
  function step() { if (k < frames.length - 1) { k++; draw(); } else stop(); }
  function load(arr) { stop(); base = arr; frames = trace(algo, base); k = 0; draw(); }

  const playBtn = h('button', {
    onclick: () => {
      if (timer) { stop(); return; }
      if (k >= frames.length - 1) k = 0;
      playBtn.textContent = '⏸ pauza';
      timer = setInterval(step, algo === 'merge' ? 450 : 550);
    },
  }, '▶ odtwarzaj');
  const btns = [
    h('button', { onclick: () => { stop(); step(); } }, 'krok'),
    playBtn,
    h('button', { onclick: () => { stop(); k = 0; draw(); } }, 'od nowa'),
    h('button', {
      onclick: () => {
        const n = base.length, pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        load(pool.slice(0, n));
      },
    }, 'losuj'),
  ];
  if (cfg.presets) {
    btns.push(
      h('button', { onclick: () => load(base.slice().sort((x, y) => x - y)) }, 'posortowana'),
      h('button', { onclick: () => load(base.slice().sort((x, y) => y - x)) }, 'odwrócona'),
    );
  }

  el.classList.add('widget');
  el.append(canvas,
    h('div', { class: 'wctl interactive-only' }, ...btns),
    h('div', { class: 'wctl' }, readout),
    h('div', { class: 'wctl' }, note));
  draw();
  if (isPrint()) stop();
}
