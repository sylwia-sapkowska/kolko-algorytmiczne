// Towers of Hanoi: move the whole tower from peg A to peg C, one disk at a time, never a larger disk on a smaller one.
// Click a peg (or press its button) to lift its top disk, then another peg to put it down.
// "rozwiązanie" plays the optimal recursive solution (2^n − 1 moves) from the start.
//
// config: {
//   width: 560, height: 300
//   n: 3                number of disks (1..7)
//   autoplay: false     play the solution on mount (not in print)
// }
// Default (and print) state: n disks on peg A, no moves made.
import { C, h, isPrint } from './util.js';

const NAMES = ['A', 'B', 'C'];

function solution(n, from, to, via, out) {
  if (n === 0) return out;
  solution(n - 1, from, via, to, out);
  out.push([from, to]);
  solution(n - 1, via, to, from, out);
  return out;
}

export function mount(el, cfg) {
  const W = cfg.width || 560, H = cfg.height || 300;
  const state = { n: Math.max(1, Math.min(7, cfg.n || 3)), pegs: null, moves: 0, held: null, bad: false };
  let timer = null;

  const canvas = h('canvas', { width: W, height: H, style: 'cursor:pointer' });
  const g = canvas.getContext('2d');
  const readout = h('span', { class: 'readout' });

  function reset() {
    stop();
    state.pegs = [Array.from({ length: state.n }, (_, i) => state.n - i), [], []];
    state.moves = 0; state.held = null; state.bad = false;
  }
  function move(a, b) {
    const pa = state.pegs[a], pb = state.pegs[b];
    if (!pa.length || (pb.length && pb[pb.length - 1] < pa[pa.length - 1])) { state.bad = true; return false; }
    pb.push(pa.pop()); state.moves++; state.bad = false;
    return true;
  }
  function pick(i) {
    stop();
    if (state.held == null) { if (state.pegs[i].length) state.held = i; state.bad = false; }
    else { if (state.held !== i) move(state.held, i); state.held = null; }
    draw();
  }

  function draw() {
    g.fillStyle = C.bg2; g.fillRect(0, 0, W, H);
    const base = H - 40, pegH = H - 90, unit = Math.min(34, (pegH - 10) / Math.max(4, state.n)), maxW = W / 3 - 24;
    for (let p = 0; p < 3; p++) {
      const cx = W / 6 + p * W / 3;
      g.fillStyle = '#5f5671'; g.fillRect(cx - 3, base - pegH, 6, pegH);
      g.fillRect(cx - maxW / 2 - 6, base, maxW + 12, 5);
      g.fillStyle = C.dim; g.font = '600 16px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(NAMES[p], cx, base + 12);
      state.pegs[p].forEach((d, k) => {
        const lifted = state.held === p && k === state.pegs[p].length - 1;
        const w = 40 + (maxW - 40) * (d - 1) / Math.max(1, state.n - 1), y = base - (k + 1) * unit - (lifted ? 18 : 0);
        g.fillStyle = lifted ? C.accent : '#9188a8';
        g.beginPath(); g.roundRect(cx - w / 2, y + 1, w, unit - 3, 5); g.fill();
      });
    }
    g.strokeStyle = '#5f5671'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    const min = 2 ** state.n - 1, done = state.pegs[2].length === state.n;
    readout.innerHTML = `ruchy: <b>${state.moves}</b> · minimum dla ${state.n} krążków: $2^{${state.n}}-1 = ${min}$ · ` +
      (done ? `<span style="color:${C.green}">✓ gotowe</span>`
        : state.bad ? `<span style="color:${C.red}">✗ niedozwolony ruch</span>` : '✗ jeszcze nie');
    window.renderMathInElement?.(readout, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }

  function stop() { if (timer) { clearTimeout(timer); timer = null; } }
  function play() {
    reset(); draw();
    const seq = solution(state.n, 0, 2, 1, []);
    let i = 0;
    const tick = () => {
      if (i >= seq.length) { timer = null; return; }
      move(...seq[i++]); draw();
      timer = setTimeout(tick, Math.max(120, 700 - 80 * state.n));
    };
    timer = setTimeout(tick, 400);
  }

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    pick(Math.min(2, Math.floor((e.clientX - r.left) / r.width * 3)));
  });
  const pegBtns = NAMES.map((name, i) => h('button', { onclick: () => pick(i), 'aria-label': `słupek ${name}` }, name));
  const nInput = h('input', { type: 'number', min: 1, max: 7, value: state.n, 'aria-label': 'liczba krążków' });
  nInput.addEventListener('change', () => {
    state.n = Math.max(1, Math.min(7, parseInt(nInput.value, 10) || 3)); nInput.value = state.n; reset(); draw();
  });

  el.classList.add('widget');
  el.append(canvas,
    h('div', { class: 'wctl interactive-only' }, h('label', {}, 'słupek'), ...pegBtns,
      h('label', { style: 'margin-left:0.6em' }, 'krążki'), nInput,
      h('button', { onclick: () => { reset(); draw(); } }, 'od nowa'),
      h('button', { onclick: play }, '▶ rozwiązanie')),
    h('div', { class: 'wctl' }, readout));

  reset();
  draw();
  if (cfg.autoplay && !isPrint()) setTimeout(play, 500);
}
