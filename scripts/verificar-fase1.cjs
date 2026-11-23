// Confere os geradores e o escore da sessão B sem navegador: `node scripts/verificar-fase1.cjs`.
// Cada gerador é conferido por um caminho independente do que a página usa.
const { performance } = require('perf_hooks');
const D = require('./carregar.cjs')();
const { LV, MX, FD, ROT, itemRng, makeStair, fitTheta, genMatrix, srNum, srLet, genSeries, srPredict, genFold, genFigure, genRotTrial, rotList, powerMetrics, rotMetrics } = D;

let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('  FALHOU:', msg); } };
const f2 = x => x.toFixed(2), pc = x => (100 * x).toFixed(0) + '%';
const QUICK = process.argv.includes('--rapido'), K = QUICK ? 0.2 : 1;

// ── 1. escada e nível estimado: sujeitos simulados ──────────────────────
// Sujeito com nível verdadeiro θ responde com P = logística(a·(θ − nível)); a escada escolhe os níveis.
console.log('escada e nível · sujeitos simulados (viés = média de θ̂ − θ; cobertura = IC95 contém θ)');
function simul(theta, n, slopeTrue, runs) {
  let sum = 0, sq = 0, cov = 0, ceil = 0, floor = 0;
  for (let r = 0; r < runs; r++) {
    const st = makeStair();
    for (let i = 0; i < n; i++) st.update(Math.random() < 1 / (1 + Math.exp(-slopeTrue * (theta - st.level))));
    const f = fitTheta(st.hist); sum += f.theta; sq += f.theta ** 2; if (f.lo <= theta + 1e-9 && theta <= f.hi + 1e-9) cov++; if (f.ceiling) ceil++; if (f.floor) floor++;
  }
  const m = sum / runs; return { m, sd: Math.sqrt(sq / runs - m * m), cov: cov / runs, ceil: ceil / runs, floor: floor / runs };
}
for (const n of [24, 16]) {
  for (const th of [2, 4, 6, 7.5]) {
    const r = simul(th, n, LV.slope, Math.round(3000 * K));
    console.log(`  ${n} itens · θ=${th}: θ̂ ${f2(r.m)} (viés ${r.m - th >= 0 ? '+' : ''}${f2(r.m - th)}, DP ${f2(r.sd)}) · cobertura ${pc(r.cov)} · teto ${pc(r.ceil)}`);
    check(Math.abs(r.m - th) < 0.35, `viés grande em θ=${th}, n=${n}`);
    check(r.cov > 0.9, `cobertura do IC baixa em θ=${th}, n=${n}`);
    check(r.ceil < 0.1 || th > 7, `teto marcado demais em θ=${th}`);
  }
}
const top = simul(10.5, 24, LV.slope, Math.round(2000 * K));
console.log(`  24 itens · θ=10,5 (acima da escala): θ̂ ${f2(top.m)} · marcado como teto em ${pc(top.ceil)} das sessões`);
check(top.ceil > 0.95, 'sujeito acima da escala deveria ser marcado como teto');
for (const a of [0.7, 1.8]) { // inclinação verdadeira diferente da suposta
  const r = simul(5, 24, a, Math.round(3000 * K));
  console.log(`  inclinação real ${a} (suposta ${LV.slope}) · θ=5: θ̂ ${f2(r.m)} (viés ${f2(r.m - 5)}) · cobertura ${pc(r.cov)}`);
  check(Math.abs(r.m - 5) < 0.4, 'θ̂ sensível demais à inclinação suposta');
}

// ── 2. matrizes ─────────────────────────────────────────────────────────
// Para cada item: as regras declaradas valem nas 8 células dadas e determinam uma única 9ª célula.
console.log('matrizes');
const RC = i => [Math.floor(i / 3), i % 3];
const ruleOk = {
  const: v => v.every(x => x === v[0]),
  lin: v => [0, 1, 2].every(r => v[3 * r] === v[3 * r + 1] && v[3 * r] === v[3 * r + 2]) && new Set([v[0], v[3], v[6]]).size === 3,
  col: v => [0, 1, 2].every(c => v[c] === v[3 + c] && v[c] === v[6 + c]) && new Set([v[0], v[1], v[2]]).size === 3,
  latino: v => [0, 1, 2].every(r => new Set([v[3 * r], v[3 * r + 1], v[3 * r + 2]]).size === 3) && [0, 1, 2].every(c => new Set([v[c], v[3 + c], v[6 + c]]).size === 3),
};
const bit = m => Math.log2(m);
function ringProgOk(v, kind) { // posições 0..7: passo constante ao longo das linhas e ao longo das colunas
  if (v.some(m => m <= 0 || (m & (m - 1)))) return false;
  const p = v.map(bit), d = (x, y) => (((y - x) % 8) + 8) % 8, a = d(p[0], p[1]), b = d(p[0], p[3]);
  for (let i = 0; i < 9; i++) { const [r, c] = RC(i); if (c < 2 && d(p[i], p[i + 1]) !== a) return false; if (r < 2 && d(p[i], p[i + 3]) !== b) return false; }
  return kind === 'prog-2d' ? a !== 0 && b !== 0 : kind === 'prog-col' ? a !== 0 && b === 0 : a === 0 && b !== 0;
}
const OPS = { xor: (x, y) => x ^ y, and: (x, y) => x & y, or: (x, y) => x | y };
const logicOk = (v, op) => [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]].every(([a, b, c]) => OPS[op](v[a], v[b]) === v[c]);
const DOM = { shape: [0, 1, 2], fill: [0, 1, 2], size: [0, 1, 2], frame: [0, 1, 2] };
for (let level = 1; level <= 8; level++) {
  const N = Math.round(2500 * K); let bad = 0, amb = 0, nRules = 0; const ansFreq = {}, seen = new Set(); let dup = 0;
  const t0 = performance.now();
  for (let k = 0; k < N; k++) {
    const it = genMatrix(level, itemRng(k * 7919 + 13, 'matrix', k % 24, level));
    const key = JSON.stringify(it.cells) + it.sig + (it.family === 'attr' ? it.shapes.join('') : ''); if (seen.has(key)) dup++; seen.add(key);
    if (JSON.stringify(genMatrix(level, itemRng(k * 7919 + 13, 'matrix', k % 24, level)).cells) !== JSON.stringify(it.cells)) bad++;   // mesma semente, mesmo item
    for (const f of it.fields) {
      const v = it.cells.map(c => c[f]), rule = it.rules[f];
      let ok, alt;
      if (f === 'grid' || (f === 'ring' && OPS[rule])) {
        ok = logicOk(v, rule);
        // identificabilidade: só a operação declarada explica as linhas e colunas completas, e as outras dariam outra resposta
        const fits = Object.keys(OPS).filter(op => [[0, 1, 2], [3, 4, 5], [0, 3, 6], [1, 4, 7]].every(([a, b, c]) => OPS[op](v[a], v[b]) === v[c]));
        alt = fits.length === 1 && fits[0] === rule ? 1 : 2;
        if (new Set(Object.keys(OPS).map(op => OPS[op](v[6], v[7]))).size < 3) alt = 2;
      } else if (f === 'ring') {
        ok = ringProgOk(v, rule); alt = 0;
        for (let p = 0; p < 8; p++) { const w = v.slice(0, 8).concat(1 << p); if (ringProgOk(w, rule)) alt++; }
      } else {
        ok = ruleOk[rule](v); alt = DOM[f].filter(x => ruleOk[rule](v.slice(0, 8).concat(x))).length;
        if (level >= 7 && f === 'frame') { /* ok */ }
      }
      if (!ok) bad++; if (alt !== 1) amb++;
      if (rule !== 'const') nRules++;
      if (f !== 'grid' && f !== 'ring') { const a = ansFreq[f] = ansFreq[f] || [0, 0, 0]; a[it.answer[f]]++; }
    }
    if (it.family === 'attr') { const [nL, nS, sat] = MX.plan[level], r = Object.values(it.rules); if (r.filter(x => x === 'latino').length !== nL || r.filter(x => x === 'lin' || x === 'col').length !== nS || !!it.useRing !== !!sat) bad++; }
    if (!D.mxEq(it.answer, it) || D.mxEq(Object.assign({}, it.answer, { frame: (it.answer.frame + 1) % 3 }), it)) bad++;
    if (D.mxCell(it.answer, it).length < 20) bad++;
  }
  const ms = (performance.now() - t0) / N, bal = Object.values(ansFreq).map(a => Math.max(...a) / N);
  console.log(`  nível ${level} × ${N}: ${f2(nRules / N)} regras/item · regra violada ${bad} · resposta não única ${amb} · repetidos ${dup} · valor mais comum da resposta ${pc(Math.max(...bal))} · ${ms.toFixed(2)} ms/item`);
  check(bad === 0, `matrizes nível ${level}: ${bad} itens com regra violada ou inconsistência`);
  check(amb === 0, `matrizes nível ${level}: ${amb} campos com resposta não única`);
  check(dup <= N * (level <= 2 ? 1 : 0.02), `matrizes nível ${level}: itens repetidos demais`);
  check(Math.max(...bal) < 0.42, `matrizes nível ${level}: resposta enviesada para um valor`);
}

// ── 3. séries ───────────────────────────────────────────────────────────
// O gerador sabe a resposta pela fórmula; o resolvedor só vê os termos mostrados. Os dois têm de concordar,
// e nenhuma outra hipótese do resolvedor pode prever um termo diferente.
console.log('séries (aceito = resolvedor prevê só a resposta do gerador; fora = resolvedor não chega à resposta)');
for (const mode of ['num', 'let']) {
  const tab = {};
  for (let level = 1; level <= 8; level++) {
    const N = Math.round(4000 * K);
    for (let k = 0; k < N; k++) {
      const R = itemRng(k * 104729 + 7, 'series', k, level), c = mode === 'let' ? srLet(level, R) : srNum(level, R); if (!c) continue;
      const t = c.t, ans = t[t.length - 1], shown = t.slice(0, -1), key = level + ' ' + c.tpl, e = tab[key] = tab[key] || { n: 0, acc: 0, out: 0, amb: 0, range: 0 };
      e.n++;
      if (t.some(x => !Number.isInteger(x) || x < 0 || x > (mode === 'let' ? 25 : 99999))) { e.range++; continue; }
      const P = srPredict(shown, mode);
      if (!P.has(ans)) e.out++; else if (P.size > 1) e.amb++; else e.acc++;
    }
  }
  for (const key of Object.keys(tab)) {
    const e = tab[key], valid = e.n - e.range;
    console.log(`  ${mode} nível ${key.padEnd(14)} aceito ${pc(e.acc / valid).padStart(4)} · ambíguo ${pc(e.amb / valid).padStart(4)} · fora ${e.out} · fora da faixa ${pc(e.range / e.n)}`);
    check(e.out === 0, `séries ${mode} ${key}: o resolvedor não chega à resposta do gerador em ${e.out} casos`);
    check(e.acc / valid > 0.25, `séries ${mode} ${key}: aceitação baixa demais`);
  }
  // itens finais: resposta única, na faixa, e exemplos para leitura
  for (let level = 1; level <= 8; level++) {
    let bad = 0; const N = Math.round(600 * K), ex = [], tpls = new Set(), t0 = performance.now();
    for (let k = 0; k < N; k++) {
      const it = genSeries(level, itemRng(k * 31 + 5, 'series', k, level), mode), P = srPredict(it.shown, mode);
      if (P.size !== 1 || !P.has(it.answer)) bad++; tpls.add(it.tpl);
      if (mode === 'let' && !/^[A-Z]$/.test(it.answerStr)) bad++;
      if (ex.length < 2 && !ex.some(e => e.tpl === it.tpl)) ex.push(it);
    }
    console.log(`  ${mode} nível ${level}: ${[...tpls].join(', ')} · ${((performance.now() - t0) / N).toFixed(2)} ms/item · ex.: ${ex.map(e => e.shownStr + ' → ' + e.answerStr).join('   |   ')}`);
    check(bad === 0, `séries ${mode} nível ${level}: ${bad} itens inválidos`);
  }
}

// ── 4. dobradura ────────────────────────────────────────────────────────
// Caminho independente: em vez de camadas e afins inversas, leva cada casa do papel aberto para a frente,
// dobra por dobra, e vê se ela termina debaixo de um furo.
console.log('dobradura');
const Q = Math.SQRT1_2;
function lineOf(id) { const k = +id.slice(1); return id[0] === 'x' ? [1, 0, k] : id[0] === 'y' ? [0, 1, k] : id[0] === 's' ? [Q, Q, k * Q] : [Q, -Q, k * Q]; }
function forwardMask(it) {
  let mask = 0; const count = it.punches.map(() => 0);
  for (let c = 0; c < 16; c++) {
    let p = [(c % 4) + 0.5, (c >> 2) + 0.5];
    for (const f of it.folds) { const [nx, ny, k] = lineOf(f.slice(0, -1)), side = f.endsWith('+') ? 1 : -1, s = nx * p[0] + ny * p[1] - k; if (side * s > 1e-9) p = [p[0] - 2 * s * nx, p[1] - 2 * s * ny]; }
    it.punches.forEach((q, j) => { if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6) { mask |= 1 << c; count[j]++; } });
  }
  return { mask, count };
}
for (let level = 1; level <= 8; level++) {
  const N = Math.round(1200 * K), sp = FD.spec[level]; let bad = 0, holes = 0, diag = 0; const seen = new Set(), t0 = performance.now();
  for (let k = 0; k < N; k++) {
    const it = genFold(level, itemRng(k * 613 + 1, 'fold', k % 20, level)), fw = forwardMask(it);
    if (fw.mask !== it.mask) bad++;
    if (it.folds.length !== sp.f || it.states.length !== sp.f || it.punches.length !== (sp.p || 1)) bad++;
    const nd = it.folds.filter(f => f[0] === 's' || f[0] === 'd').length; if ((sp.diag === 0 && nd) || (sp.diag === 1 && !nd)) bad++; if (nd) diag++;
    if (sp.half === 1 && !/^[xy]2/.test(it.folds[0])) bad++; if (sp.half === -1 && /^[xy]2/.test(it.folds[0])) bad++;
    if (it.nHoles < 2 || it.nHoles > 10 || fw.count[0] < sp.need) bad++;
    // a parte dobrada nunca sai do quadrado
    for (const st of it.states) for (const ly of st) for (const p of ly.poly) if (p[0] < -1e-6 || p[0] > 4 + 1e-6 || p[1] < -1e-6 || p[1] > 4 + 1e-6) bad++;
    holes += it.nHoles; seen.add(it.folds.join(' ') + '|' + it.mask);
  }
  console.log(`  nível ${level} × ${N}: ${sp.f} dobra(s), ${sp.p || 1} furo(s) no papel dobrado · furos abertos em média ${f2(holes / N)} · com diagonal ${pc(diag / N)} · itens distintos ${seen.size} · inválidos ${bad} · ${((performance.now() - t0) / N).toFixed(1)} ms/item`);
  check(bad === 0, `dobradura nível ${level}: ${bad} itens em que os dois métodos discordam ou a especificação falha`);
  check(seen.size >= (level === 1 ? 4 : 12), `dobradura nível ${level}: pouca variedade de itens`);
}

// ── 5. rotação 3D ───────────────────────────────────────────────────────
console.log('rotação 3D');
{
  // quiralidade por caminho independente: tenta as 24 rotações como composições de giros de 90° e compara conjuntos
  const rx = c => [c[0], -c[2], c[1]], ry = c => [c[2], c[1], -c[0]], rz = c => [-c[1], c[0], c[2]];
  const norm = C => { const mn = [0, 1, 2].map(k => Math.min(...C.map(c => c[k]))); return C.map(c => c.map((v, k) => v - mn[k]).join(',')).sort().join(';'); };
  const orient = C => { const out = new Set(); let A = C; for (let i = 0; i < 4; i++) { A = A.map(rx); let B = A; for (let j = 0; j < 4; j++) { B = B.map(ry); let E = B; for (let l = 0; l < 4; l++) { E = E.map(rz); out.add(norm(E)); } } } return out; };
  const N = Math.round(1500 * K); let bad = 0, maxR = 0; const shapes = new Set();
  for (let k = 0; k < N; k++) {
    const C = genFigure(itemRng(k, 'fig', k, 0));
    if (C.length !== 10 || new Set(C.map(c => c.join())).size !== 10) bad++;
    for (let i = 1; i < 10; i++) if (Math.abs(C[i][0] - C[i - 1][0]) + Math.abs(C[i][1] - C[i - 1][1]) + Math.abs(C[i][2] - C[i - 1][2]) !== 1) bad++;   // cadeia contínua
    const O = orient(C); if (O.size !== 24) bad++;                       // sem simetria de rotação
    if (O.has(norm(C.map(c => [-c[0], c[1], c[2]])))) bad++;             // a espelhada não é alcançável por rotação
    shapes.add([...O].sort()[0]);
  }
  for (const angle of ROT.angles) for (const mirror of [false, true]) for (let k = 0; k < Math.round(300 * K); k++) {
    const tr = genRotTrial(itemRng(k, 'rot', k, angle), angle, mirror);
    if (Math.abs(Math.abs(tr.azB - tr.azA) - angle) > 1e-9) bad++;
    for (const az of [tr.azA, tr.azB]) { const b = ((az % 90) + 90) % 90; if (b < 14 || b > 76) bad++; }
    const same = JSON.stringify(tr.A) === JSON.stringify(tr.B); if (same === mirror) bad++;
    const cen = [0, 1, 2].map(i => tr.A.reduce((s, c) => s + c[i], 0)); if (cen.some(v => Math.abs(v) > 1e-9)) bad++;
    // a figura desenhada cabe no quadro (−75..75), nas duas vistas
    for (const [C, az] of [[tr.A, tr.azA], [tr.B, tr.azB]]) {
      const svg = D.rotSvg(C, az); if (!/^<svg[^>]*>(<polygon [^>]*\/>){30,}<\/svg>$/.test(svg)) bad++;
      for (const m of svg.matchAll(/points="([^"]+)"/g)) for (const v of m[1].split(/[ ,]/)) maxR = Math.max(maxR, Math.abs(+v));
    }
  }
  const L = rotList(ROT.reps, itemRng(1, 'ordem', 0, 0)); let run = 1, maxRun = 1; for (let i = 1; i < L.length; i++) { run = L[i].mirror === L[i - 1].mirror ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
  const cnt = {}; L.forEach(t => { const k = t.angle + (t.mirror ? 'm' : 's'); cnt[k] = (cnt[k] || 0) + 1; });
  console.log(`  ${N} figuras: inválidas ${bad} · formas distintas ${shapes.size} · coordenada máxima desenhada ${maxR.toFixed(0)} (quadro ±75) · lista de ${L.length} pares, ${Object.values(cnt).join('/')} por condição, sequência máxima ${maxRun}`);
  check(bad === 0, `rotação: ${bad} problemas em figuras ou pares`);
  check(maxR <= 75, 'rotação: figura não cabe no quadro');
  check(L.length === 72 && Object.values(cnt).every(v => v === ROT.reps) && maxRun <= 3, 'rotação: lista de pares');
}

// ── 6. métricas ─────────────────────────────────────────────────────────
{
  const T = []; for (const a of ROT.angles) for (const m of [false, true]) for (let r = 0; r < 9; r++) T.push({ module: 'rot', phase: 'test', angle: a, cond: m ? 'mirror' : 'same', correct: !(a === 160 && r === 0), timeout: false, rt: 900 + 11 * a + (r - 4) * 20 });
  const m = rotMetrics(T);
  console.log(`métricas · rotação sintética (RT = 900 + 11·ângulo): inclinação ${f2(m.slope)} ms/°, intercepto ${m.icpt.toFixed(0)} ms, acurácia ${pc(m.acc)} · por ângulo ${m.accByAngle.map(pc).join(' ')}`);
  check(Math.abs(m.slope - 11) < 0.3 && Math.abs(m.icpt - 900) < 30 && Math.abs(m.acc - 70 / 72) < 1e-9 && !m.ceiling, 'métricas da rotação');
  const P = [3, 5, 7, 8, 8, 8, 7, 8].map((level, i) => ({ level, correct: ![5, 7].includes(i), rt: 20000 + i, timeout: false, part: 1 })), pm = powerMetrics(P);
  console.log(`métricas · potência sintética (acertos em 3,5,7,8,8; erros em 8,8; acerto em 7): nível ${f2(pm.theta)} IC ${f2(pm.lo)}–${f2(pm.hi)} · maior nível resolvido ${pm.maxOk} · teto=${pm.ceiling}`);
  check(pm.n === 8 && pm.nCorrect === 6 && pm.maxOk === 8 && pm.theta > 7 && pm.byLevel[8][1] === 4, 'métricas de potência');
  const all = fitTheta(Array.from({ length: 24 }, () => ({ level: 8, ok: true })));
  check(all.ceiling && all.theta >= LV.max + 1.4, 'tudo certo no nível máximo deveria ser teto');
}

console.log(fails ? `\nRESULTADO: ${fails} FALHA(S)` : '\nRESULTADO: OK');
process.exit(fails ? 1 : 0);
