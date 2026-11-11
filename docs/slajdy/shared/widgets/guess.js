// Guess the number: the secret is in 1..n; every guess is answered "za mało" / "za dużo" / "trafione".
// One row per question shows the candidates that are still possible (amber) inside 1..n (dim), so the
// halving is visible. "środek" proposes the middle of the remaining interval (binary search).
//
// config: {
//   width: 560, height: 360
//   n: 100              numbers 1..n
//   secret: 58          secret of the default state (58 needs 7 halving questions for n = 100);
//                       with solved: false and no secret, it is drawn from `seed`
//   solved: true        default state: the binary-search trace for `secret` already played
//   seed: 1             seeds the secret drawn by "nowa liczba"
// }
// Default (and print) state: solved ? the full binary-search trace for `secret` : an empty board.
import { C, h } from './util.js';

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

export function mount(el, cfg) {
  const W = cfg.width || 560, H = cfg.height || 360, n = cfg.n || 100;
  const rand = rng(cfg.seed ?? 1);
  const state = { secret: cfg.secret ?? (cfg.solved === false ? 1 + Math.floor(rand() * n) : 58), lo: 1, hi: n, rows: [], done: false };

  const canvas = h('canvas', { width: W, height: H });
  const g = canvas.getContext('2d');
  const readout = h('span', { class: 'readout' });

  const answer = x => (x === state.secret ? 'trafione' : x < state.secret ? 'za mało' : 'za dużo');
  function ask(x) {
    if (state.done || !(x >= 1 && x <= n)) return;
    const a = answer(x);
    state.rows.push({ lo: state.lo, hi: state.hi, x, a });
    if (a === 'trafione') { state.done = true; state.lo = state.hi = x; }
    else if (a === 'za mało') state.lo = Math.max(state.lo, x + 1);
    else state.hi = Math.min(state.hi, x - 1);
  }
  const middle = () => Math.floor((state.lo + state.hi) / 2);
  function reset(secret) { Object.assign(state, { secret, lo: 1, hi: n, rows: [], done: false }); }

  function draw() {
    g.fillStyle = C.bg2; g.fillRect(0, 0, W, H);
    const L = 96, R = W - 150, X = v => L + (v - 0.5) / n * (R - L), cell = (R - L) / n;
    const rowH = Math.min(40, (H - 50) / 8), top = 18;
    g.font = '14px Inter, Arial'; g.textBaseline = 'middle';
    // scale
    g.fillStyle = C.dim; g.textAlign = 'center';
    for (const v of [1, Math.round(n / 4), Math.round(n / 2), Math.round(3 * n / 4), n]) g.fillText(v, X(v), top);
    const rows = state.rows.length ? state.rows : [{ lo: 1, hi: n }];
    rows.forEach((r, i) => {
      const y = top + 22 + i * rowH, hh = rowH * 0.55;
      g.fillStyle = C.line; g.fillRect(L, y, R - L, hh);
      g.fillStyle = C.accent; g.fillRect(L + (r.lo - 1) * cell, y, (r.hi - r.lo + 1) * cell, hh);
      g.textAlign = 'left'; g.fillStyle = C.dim; g.font = '14px Inter, Arial';
      g.fillText(`${r.hi - r.lo + 1} liczb`, 10, y + hh / 2);
      if (r.x != null) {
        const col = r.a === 'trafione' ? C.green : C.fg;
        g.strokeStyle = col; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(X(r.x), y - 3); g.lineTo(X(r.x), y + hh + 3); g.stroke();
        g.fillStyle = col; g.font = '600 15px Inter, Arial';
        g.fillText(`${r.x}? ${r.a}`, R + 12, y + hh / 2 + 1);
      }
    });
    g.strokeStyle = '#5f5671'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    const k = state.rows.length;
    readout.innerHTML = state.done
      ? `pytań: <b>${k}</b> · liczba to <span style="color:${C.green}">${state.secret}</span>`
      : `pytań: <b>${k}</b> · zostało: ${state.hi - state.lo + 1} (od ${state.lo} do ${state.hi})`;
  }

  const input = h('input', { type: 'number', min: 1, max: n, value: Math.floor((1 + n) / 2), 'aria-label': 'twoja liczba' });
  const askBtn = h('button', { onclick: () => { ask(parseInt(input.value, 10)); draw(); } }, 'zapytaj');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') askBtn.click(); });
  const midBtn = h('button', { onclick: () => { input.value = middle(); } }, 'środek');
  const newBtn = h('button', { onclick: () => { reset(1 + Math.floor(rand() * n)); input.value = middle(); draw(); } }, 'nowa liczba');

  el.classList.add('widget');
  el.append(canvas,
    h('div', { class: 'wctl interactive-only' }, h('label', {}, 'czy to'), input, askBtn, midBtn, newBtn),
    h('div', { class: 'wctl' }, readout));

  if (cfg.solved ?? true) while (!state.done) ask(middle());
  draw();
}
