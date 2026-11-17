// How fast functions grow: for a chosen n, the number of steps of log n, n, n log n, n² and 2ⁿ,
// as bars on a logarithmic scale, with the time at about 10⁸ simple operations per second.
// The dashed line is 10⁸ steps (≈ 1 s): green bars fit under it, red ones do not.
//
// config: {
//   width: 600, height: 330
//   n: 1000             n of the default state; one of 10, 20, 100, 1000, 10⁴, 10⁵, 10⁶
// }
// Default (and print) state: n = cfg.n.
import { C, h } from './util.js';

const NS = [10, 20, 100, 1000, 1e4, 1e5, 1e6];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = k => String(k).split('').map(d => SUP[+d]).join('');
// log10 of the number of steps (2ⁿ overflows a double, so everything is kept as a logarithm)
const FUNCS = [
  { name: 'log₂ n', lg: n => Math.log10(Math.log2(n)) },
  { name: 'n', lg: n => Math.log10(n) },
  { name: 'n log₂ n', lg: n => Math.log10(n * Math.log2(n)) },
  { name: 'n²', lg: n => 2 * Math.log10(n) },
  { name: '2ⁿ', lg: n => n * Math.log10(2) },
];

function fmtNum(lg) {
  if (lg < 6) {
    const v = Math.round(10 ** lg);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  const e = Math.floor(lg), m = 10 ** (lg - e);
  return `${m.toFixed(1).replace('.', ',')}·10${sup(e)}`;
}

function fmtTime(lg) { // lg = log10(steps); 10⁸ steps per second
  const s = 10 ** (lg - 8);
  if (lg - 8 > 15) return `≈ 10${sup(Math.floor(lg - 8 - Math.log10(3.15e7)))} lat`;
  if (s < 0.001) return '< 0,001 s';
  if (s < 1) return `${s.toPrecision(1).replace('.', ',')} s`;
  const r = (v, u) => `${v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')} ${u}`;
  if (s < 60) return r(s, 's');
  if (s < 3600) return r(s / 60, 'min');
  if (s < 86400) return r(s / 3600, 'h');
  if (s < 3.15e7) return r(s / 86400, 'dni');
  return r(s / 3.15e7, 'lat');
}

export function mount(el, cfg) {
  const W = cfg.width || 600, H = cfg.height || 330;
  let n = NS.includes(cfg.n) ? cfg.n : 1000;

  const canvas = h('canvas', { width: W, height: H });
  const g = canvas.getContext('2d');

  function draw() {
    g.fillStyle = C.bg2; g.fillRect(0, 0, W, H);
    const L = 100, R = W - 130, MAX = 14, X = lg => L + Math.min(lg, MAX) / MAX * (R - L);
    const top = 44, rowH = (H - top - 20) / FUNCS.length;
    g.textBaseline = 'middle';
    // scale: powers of ten
    g.font = '14px Inter, Arial'; g.textAlign = 'center';
    for (let e = 0; e <= MAX; e += 2) {
      g.fillStyle = C.dim; g.fillText(`10${sup(e)}`, X(e), 16);
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(e), 26); g.lineTo(X(e), H - 14); g.stroke();
    }
    // 10⁸ steps ≈ 1 s
    g.strokeStyle = C.accent; g.lineWidth = 2; g.setLineDash([6, 5]);
    g.beginPath(); g.moveTo(X(8), 26); g.lineTo(X(8), H - 14); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.accent; g.font = '600 14px Inter, Arial'; g.textAlign = 'left'; g.fillText('≈ 1 s', X(8) + 6, 36);
    FUNCS.forEach((f, i) => {
      const y = top + i * rowH + rowH / 2, lg = Math.max(0, f.lg(n)), ok = lg <= 8;
      g.textAlign = 'right'; g.fillStyle = C.fg; g.font = '600 16px Inter, Arial';
      g.fillText(f.name, L - 12, y);
      g.fillStyle = ok ? C.green : C.red;
      g.fillRect(L, y - rowH * 0.28, Math.max(2, X(lg) - L), rowH * 0.56);
      if (lg > MAX) { g.fillStyle = C.red; g.font = '600 14px Inter, Arial'; g.textAlign = 'left'; g.fillText('→', R + 4, y); }
      g.textAlign = 'left'; g.font = '14px Inter, Arial'; g.fillStyle = C.fg;
      g.fillText(fmtNum(lg), R + 22, y - 9);
      g.fillStyle = ok ? C.dim : C.red; g.font = '13px Inter, Arial';
      g.fillText(fmtTime(lg), R + 22, y + 10);
    });
    g.strokeStyle = '#5f5671'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
    btns.forEach(b => b.classList.toggle('active', +b.dataset.n === n));
  }

  const btns = NS.map(v => h('button', { 'data-n': v, onclick: () => { n = v; draw(); } },
    v < 1e4 ? String(v) : `10${sup(Math.round(Math.log10(v)))}`));
  el.classList.add('widget');
  el.append(canvas, h('div', { class: 'wctl' }, h('label', {}, 'n ='), ...btns));
  draw();
}
