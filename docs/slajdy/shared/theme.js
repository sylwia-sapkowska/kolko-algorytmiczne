// Light theme for printing (?print-pdf) and previewing (?light). The decks are designed dark; instead of
// keeping a second copy of every colour, light mode maps the dark-theme colours wherever they appear:
// stylesheets (including the CSS custom properties in deck.css), SVG / HTML colour attributes and inline styles (also of
// widgets created later), canvas 2D drawing. Photos (<img>) and image pixels
// (putImageData, rgb(...) not in the table) are left alone.

const q = new URLSearchParams(location.search);
export const LIGHT = q.has('light') || /print-pdf/i.test(location.search);

// dark-theme colour → light-theme colour (theme tokens and the greys used in figures)
const TABLE = {
  '#17131d': '#ffffff', '#1c1724': '#f8f6fb', '#221c2b': '#f4f1f8', '#2a2333': '#eeeaf3',
  '#2c2437': '#ebe6f1', '#2e2739': '#e7e2ee', '#312a3c': '#e4dfeb', '#342d40': '#dfd9e8',
  '#3f3550': '#cdc5da', '#4e4560': '#b9b0c7', '#5f5671': '#a39ab2', '#655b78': '#9c93ad',
  '#72688a': '#7f7592', '#857b98': '#6d6382', '#9188a8': '#62587a', '#a59cb5': '#5a5068',
  '#d1cadb': '#41394f', '#ece8f3': '#1d1826',
  '#f2b134': '#b27a00', '#b18cff': '#6b3fd0', '#ff6b6b': '#d23c3c', '#5fd38d': '#17914a',
  '#f07ac8': '#b02a83', '#ffd34d': '#c99a00', '#a9cbe8': '#3f7fb5', '#e9dcc0': '#d9c7a0',
};

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const RGB_TABLE = Object.fromEntries(Object.entries(TABLE).map(([d, l]) => [hex2rgb(d).join(','), hex2rgb(l)]));

// Colours outside the table: greys are inverted, bright saturated colours darkened, white/black kept.
function generic(hex) {
  const [r, g, b] = hex2rgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (l > 0.97 || l < 0.03) return hex;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let l2;
  if (s < 0.2) l2 = 1 - l;
  else if (l > 0.6) l2 = Math.max(0.35, l - 0.25);
  else return hex;
  // keep hue and saturation, change lightness
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const c = (1 - Math.abs(2 * l2 - 1)) * s, x = c * (1 - Math.abs((h % 2) - 1)), m = l2 - c / 2;
  const [r1, g1, b1] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return rgb2hex([r1 + m, g1 + m, b1 + m].map(v => (v < 0 ? 0 : v) * 255));
}

export function mapHex(hex) {
  hex = hex.toLowerCase();
  if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
  return TABLE[hex] || generic(hex);
}

// Map every colour inside a CSS/SVG colour string (several may appear, e.g. in a style attribute).
export function mapColors(str, allRgb = false) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, mapHex)
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g, (m, r, g, b, a) => {
      const key = `${r},${g},${b}`;
      let c = RGB_TABLE[key];
      if (!c && key === '255,255,255' && a) c = [0, 0, 0]; // translucent white highlight → translucent black
      if (!c && allRgb) c = hex2rgb(generic(rgb2hex([+r, +g, +b])));
      if (!c) return m;
      return a ? `rgba(${c.join(',')}${a})` : `rgb(${c.join(',')})`;
    });
}

const ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'color', 'style', 'bgcolor'];

// Values this module wrote, per element: mapping is not idempotent (a light colour would be mapped again),
// so attribute changes we caused ourselves are skipped.
const written = new WeakMap();

function mapElement(el) {
  if (el.nodeType !== 1 || el.tagName === 'IMG') return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !/#|rgb/.test(v)) continue;
    const mine = written.get(el);
    if (mine && mine[a] === v) continue;
    const m = mapColors(v);
    if (m !== v) {
      (mine || written.set(el, {}).get(el))[a] = m;
      el.setAttribute(a, m);
    }
  }
}

function mapTree(root) {
  mapElement(root);
  root.querySelectorAll?.('*').forEach(mapElement);
}

function patchCanvas() {
  const P = CanvasRenderingContext2D.prototype;
  for (const prop of ['fillStyle', 'strokeStyle', 'shadowColor']) {
    const d = Object.getOwnPropertyDescriptor(P, prop);
    Object.defineProperty(P, prop, { ...d, set(v) { d.set.call(this, mapColors(v)); } });
  }
  const addStop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (o, c) { return addStop.call(this, o, mapColors(c)); };
}

// Stylesheets (deck.css custom properties, deck <style> blocks, reveal.css): browsers may serialize
// colours as rgb(...), so every rgb value is mapped here (unlike in canvas, where rgb(...) can be image pixels).
function mapStyleSheets() {
  const walk = rules => {
    for (const r of rules) {
      if (r.cssRules) walk(r.cssRules);
      const st = r.style;
      if (!st) continue;
      for (let i = 0; i < st.length; i++) {
        const prop = st[i], v = st.getPropertyValue(prop);
        if (/#|rgb/.test(v)) {
          const m = mapColors(v, true);
          if (m !== v) st.setProperty(prop, m, st.getPropertyPriority(prop));
        }
      }
    }
  };
  for (const sh of document.styleSheets) {
    try { walk(sh.cssRules); } catch { /* cross-origin sheet */ }
  }
}

// Call once, before any widget mounts.
export async function applyTheme() {
  if (!LIGHT) return;
  document.documentElement.classList.add('light');
  mapStyleSheets();
  patchCanvas();
  mapTree(document.body);
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'attributes') mapElement(m.target);
      else m.addedNodes.forEach(n => n.nodeType === 1 && mapTree(n));
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ATTRS });
}
