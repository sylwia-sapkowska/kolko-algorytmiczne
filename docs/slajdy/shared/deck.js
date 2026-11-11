// Shared deck bootstrap: reveal.js + KaTeX auto-render + lazy widget mounting.
// Usage in a deck: <script type="module" src="../shared/deck.js"></script>
// Widgets: <div data-widget="hanoi" data-config='{"n":3}'></div>
import Reveal from '../vendor/reveal/reveal.mjs';
import Notes from '../vendor/reveal/plugin/notes.mjs';
import { applyTheme } from './theme.js';

const widgetModules = {
  guess: () => import('./widgets/guess.js'),
  hanoi: () => import('./widgets/hanoi.js'),
  nim: () => import('./widgets/nim.js'),
};

function renderMath(root) {
  window.renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
    trust: ctx => ctx.command === '\\htmlClass',   // \htmlClass{name}{…}: a part of a formula that an arrow can point to (widgets/annotate.js)
    strict: code => (code === 'htmlExtension' ? 'ignore' : 'warn'),
  });
}

async function mountWidget(el) {
  if (el.dataset.mounted) return;
  el.dataset.mounted = '1';
  const gen = el.dataset.gen = String((+el.dataset.gen || 0) + 1);
  const load = widgetModules[el.dataset.widget];
  if (!load) { el.textContent = `Unknown widget: ${el.dataset.widget}`; return; }
  const config = el.dataset.config ? JSON.parse(el.dataset.config) : {};
  const mod = await load();
  if (el.dataset.gen !== gen || !el.dataset.mounted) return; // unmounted while loading
  await mod.mount(el, config);
}

// Release widgets on slides we are not near (they also reset to their default state when revisited).
function unmountWidget(el) {
  if (!el.dataset.mounted) return;
  el.replaceChildren();
  el.removeAttribute('style');
  el.classList.remove('widget');
  delete el.dataset.mounted;
  el.dataset.gen = String((+el.dataset.gen || 0) + 1);
}

await applyTheme(); // light colours for ?print-pdf and ?light

const deck = new Reveal({
  width: 1280,
  height: 720,
  margin: 0.04,
  hash: true,
  slideNumber: 'c/t',
  transition: 'fade',
  transitionSpeed: 'fast',
  center: false,
  pdfSeparateFragments: false,
  plugins: [Notes],
});

await deck.initialize();
renderMath(document.querySelector('.reveal .slides'));

const frames = n => new Promise(res => { const f = k => (k ? requestAnimationFrame(() => f(k - 1)) : res()); f(n); });

// Print view: mount every widget, one at a time, then set window.__deckReady (a PDF export script can wait for it).
async function mountAllForPrint() {
  // reveal builds the print layout over several animation frames after 'ready'; a widget mounted before its page
  // exists is laid out at size 0, so wait for the pages first.
  for (let i = 0; i < 600 && !document.querySelector('.pdf-page'); i++) await frames(1);
  await frames(3);
  for (const el of document.querySelectorAll('[data-widget]')) {
    await mountWidget(el);
    await frames(3);
  }
  // an animated GIF prints as its first frame: print a still (the last frame) instead
  for (const img of document.querySelectorAll('img[data-print-src]')) {
    img.src = img.dataset.printSrc;
    try { await img.decode(); } catch { /* a missing image must not block the PDF */ }
  }
  await document.fonts.ready;
  renderMath(document.querySelector('.reveal .slides'));
  await frames(3);
  window.__deckReady = true;
}

// Mount widgets on the current slide and its neighbours; in print view mount everything.
let printing = false;
function mountAround() {
  if (deck.isPrintView()) {
    if (!printing) { printing = true; mountAllForPrint(); }
    return;
  }
  const cur = deck.getCurrentSlide();
  const keep = [cur?.previousElementSibling, cur, cur?.nextElementSibling].filter(Boolean);
  document.querySelectorAll('.reveal .slides section').forEach(sec => {
    if (!keep.includes(sec)) sec.querySelectorAll('[data-widget][data-mounted]').forEach(unmountWidget);
  });
  keep.forEach(s => s.querySelectorAll('[data-widget]').forEach(mountWidget));
}

deck.on('ready', mountAround);
deck.on('slidechanged', mountAround);
mountAround();

// Chrome lays out SVG text at the size the figure had at that moment and may keep it when the figure is
// rescaled (reveal resizes the slides, a widget next to it mounts, fonts load): the labels drift away from their
// lines. Toggling an inherited text property forces a fresh text layout.
function relayoutSvgText(svgs) {
  svgs.forEach(s => { s.style.textRendering = 'geometricPrecision'; });
  requestAnimationFrame(() => svgs.forEach(s => { s.style.textRendering = ''; }));
}
const svgResize = new ResizeObserver(entries => relayoutSvgText(entries.map(e => e.target)));
document.querySelectorAll('.reveal .slides svg').forEach(s => svgResize.observe(s));
deck.on('resize', () => relayoutSvgText(document.querySelectorAll('.reveal .slides section.present svg')));
document.fonts.ready.then(() => relayoutSvgText(document.querySelectorAll('.reveal .slides svg')));

window.deck = deck;
