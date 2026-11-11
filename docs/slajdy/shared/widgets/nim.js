// Matchstick game against the computer: take 1..k matches in turn; whoever takes the last match wins.
// The computer plays perfectly: it leaves a multiple of (k + 1) whenever it can, otherwise it takes one match.
// With "hint", a strip 0..total marks every position as losing (red) or winning (green) for the player to move.
//
// config: {
//   width: 600, height: 200
//   total: 21           matches at the start
//   take: 3             at most this many per move
//   hint: false         show the losing/winning strip
//   first: "ty"         who moves first: "ty" (the viewer) or "komputer"
// }
// Default (and print) state: `total` matches, nobody has moved yet.
import { C, h } from './util.js';

export function mount(el, cfg) {
  const W = cfg.width || 600, H = cfg.height || (cfg.hint ? 200 : 150);
  const total = cfg.total || 21, k = cfg.take || 3;
  const state = { left: total, first: cfg.first === 'komputer' ? 'komputer' : 'ty', log: [], winner: null, hint: !!cfg.hint };
  const losing = m => m % (k + 1) === 0;

  const canvas = h('canvas', { width: W, height: H });
  const g = canvas.getContext('2d');
  const readout = h('span', { class: 'readout' });

  function takeMatches(who, t) {
    state.left -= t; state.log.push(`${who}: ${t}`);
    if (state.left === 0) state.winner = who;
  }
  function computer() {
    if (state.winner) return;
    const r = state.left % (k + 1);
    takeMatches('komputer', r === 0 ? 1 : r);
  }
  function reset() {
    Object.assign(state, { left: total, log: [], winner: null });
    if (state.first === 'komputer') computer();
  }

  function draw() {
    g.fillStyle = C.bg2; g.fillRect(0, 0, W, H);
    // matches
    const gap = Math.min(24, (W - 40) / total), x0 = (W - gap * (total - 1)) / 2, y0 = 22, mh = 70;
    for (let i = 0; i < total; i++) {
      const x = x0 + i * gap, on = i < state.left;
      g.fillStyle = on ? '#d1cadb' : C.line; g.fillRect(x - 2.5, y0 + 10, 5, mh - 10);
      g.fillStyle = on ? C.red : C.line; g.beginPath(); g.ellipse(x, y0 + 8, 4.5, 7, 0, 0, 7); g.fill();
    }
    if (state.hint) {
      const sy = y0 + mh + 34, cw = Math.min(26, (W - 40) / (total + 1)), sx = (W - cw * (total + 1)) / 2;
      g.font = '13px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let m = 0; m <= total; m++) {
        const x = sx + m * cw;
        g.fillStyle = losing(m) ? C.red : C.green; g.globalAlpha = m === state.left ? 1 : 0.35;
        g.fillRect(x + 1, sy, cw - 2, 24); g.globalAlpha = 1;
        g.fillStyle = m === state.left ? C.bg : C.fg; g.fillText(m, x + cw / 2, sy + 12.5);
      }
      g.fillStyle = C.dim; g.textAlign = 'left';
      g.fillText('ile zapałek zostało przed ruchem', sx, sy + 40);
    }
    g.strokeStyle = '#5f5671'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    const turn = state.winner ? (state.winner === 'ty'
      ? `<span style="color:${C.green}">✓ wygrywasz!</span>` : `<span style="color:${C.red}">✗ wygrywa komputer</span>`)
      : 'twój ruch';
    readout.innerHTML = `zostało: <b>${state.left}</b> · ${turn}` + (state.log.length ? ` · ${state.log.join(', ')}` : '');
    takeBtns.forEach((b, i) => { b.disabled = !!state.winner || i + 1 > state.left; });
  }

  const takeBtns = Array.from({ length: k }, (_, i) => h('button', {
    onclick: () => { if (state.winner || i + 1 > state.left) return; takeMatches('ty', i + 1); computer(); draw(); },
  }, `weź ${i + 1}`));
  const firstBtn = h('button', {
    onclick: () => { state.first = state.first === 'ty' ? 'komputer' : 'ty'; firstBtn.textContent = `zaczyna: ${state.first}`; reset(); draw(); },
  }, `zaczyna: ${state.first}`);
  const hintBtn = h('button', { onclick: () => { state.hint = !state.hint; hintBtn.classList.toggle('active', state.hint); draw(); } }, 'podpowiedź');
  hintBtn.classList.toggle('active', state.hint);

  el.classList.add('widget');
  el.append(canvas,
    h('div', { class: 'wctl interactive-only' }, ...takeBtns, firstBtn, h('button', { onclick: () => { reset(); draw(); } }, 'od nowa'), ...(cfg.hint ? [hintBtn] : [])),
    h('div', { class: 'wctl' }, readout));

  reset();
  draw();
}
