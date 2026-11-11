// Small helpers shared by widgets: palette and DOM.

export const C = {
  bg: '#17131d', bg2: '#221c2b', bg3: '#2c2437', fg: '#ece8f3', dim: '#a59cb5',
  accent: '#f2b134', blue: '#b18cff', red: '#ff6b6b', green: '#5fd38d', purple: '#f07ac8', line: '#3f3550',
};

export function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) e.append(c instanceof Node ? c : document.createTextNode(c));
  return e;
}

export function isPrint() {
  // the class appears only once reveal has set up the print view; the first widget may mount before that
  return document.documentElement.classList.contains('reveal-print') || /print-pdf/i.test(location.search);
}
