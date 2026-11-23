// Carrega o <script> do index.html num contexto com um DOM mínimo de mentira e devolve
// as funções puras que a página expõe em window.__FE.dev. Sem dependências.
const fs = require('fs'), path = require('path'), vm = require('vm');

module.exports = function carregar() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const el = () => ({ innerHTML: '', textContent: '', style: { setProperty() {} }, classList: { toggle() {}, add() {} }, dataset: {} });
  const ctx = {
    document: { querySelector: el, querySelectorAll: () => [], addEventListener() {}, createElement: el, body: { appendChild() {} } },
    matchMedia: () => ({ matches: false }), screen: { width: 1280, height: 800 },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'node' }, performance, setTimeout, clearTimeout, console,
    requestAnimationFrame: f => setTimeout(f, 0), cancelAnimationFrame() {}, scrollTo() {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.__FE.dev;
};
