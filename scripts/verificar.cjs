// Confere o gerador e o escore do 3-back sem navegador: `node scripts/verificar.cjs`.
const { performance } = require('perf_hooks');
const { genNbackFixed, nback3Metrics, computeSummary, nbCounts, NB_LETTERS, NB3, MODULES, INDICATORS } = require('./carregar.cjs')();

let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('  FALHOU:', msg); } };
const f2 = x => x.toFixed(2);

// ── 1. gerador ──────────────────────────────────────────────────────────
// Reclassifica cada posição só pela sequência e compara com o rótulo do gerador.
function classify(seq, i, n) {
  const b = j => seq[i - j], x = seq[i];
  if (i < n) return 'lead';
  if (x === b(n)) return 'target';
  const m = [1, n - 1, n + 1].filter(j => x === b(j));
  if (m.length === 1 && m[0] === n - 1) return 'lure' + (n - 1);
  if (m.length === 1 && m[0] === n + 1) return 'lure' + (n + 1);
  return m.length ? 'impuro' : 'nontarget';
}
for (const scored of [8, NB3.practice, NB3.scored]) {
  const N = NB3.N, RUNS = scored === NB3.scored ? 20000 : 4000, want = nbCounts(scored);
  const posT = Array(scored).fill(0), letters = {}; let maxRun = 0, bad = 0;
  const t0 = performance.now();
  for (let r = 0; r < RUNS; r++) {
    const { seq, type } = genNbackFixed(N, scored);
    if (seq.length !== N + scored || type.length !== seq.length) bad++;
    const cnt = {}; let run = 0;
    for (let i = 0; i < seq.length; i++) {
      if (!NB_LETTERS.includes(seq[i])) bad++;
      if (classify(seq, i, N) !== type[i]) bad++;
      cnt[type[i]] = (cnt[type[i]] || 0) + 1;
      letters[seq[i]] = (letters[seq[i]] || 0) + 1;
      run = type[i] === 'target' ? run + 1 : 0; maxRun = Math.max(maxRun, run);
      if (type[i] === 'target') posT[i - N]++;
    }
    if (new Set(seq.slice(0, N)).size !== N) bad++;
    if (cnt.lead !== N || cnt.target !== want.nT || (cnt.lure2 || 0) !== want.nA || (cnt.lure4 || 0) !== want.nB || cnt.nontarget !== want.nN) bad++;
  }
  const ms = (performance.now() - t0) / RUNS, pT = posT.map(c => c / RUNS), lf = Object.values(letters), tot = lf.reduce((a, b) => a + b, 0);
  console.log(`gerador · ${scored} pontuados × ${RUNS}: alvos ${want.nT}, iscas ${want.nA}+${want.nB}, não-alvos ${want.nN} · ` +
    `máx. alvos seguidos ${maxRun} · P(alvo) por posição ${f2(Math.min(...pT))}–${f2(Math.max(...pT))} · ` +
    `letras ${(100 * Math.min(...lf) / tot).toFixed(1)}–${(100 * Math.max(...lf) / tot).toFixed(1)}% · ${ms.toFixed(2)} ms/seq`);
  check(bad === 0, `${bad} sequência(s) com rótulo, contagem ou letra inválidos`);
  check(maxRun <= 2, 'mais de 2 alvos seguidos');
}

// ── 2. escore com respondedores simulados ───────────────────────────────
function session(policy) {
  const T = [];
  for (let b = 1; b <= NB3.blocks; b++) {
    const { seq, type } = genNbackFixed(NB3.N, NB3.scored);
    seq.forEach((stim, i) => {
      const cond = type[i], go = cond !== 'lead' && policy(cond), isT = cond === 'target';
      T.push({ module: 'nback3', phase: 'test', block: 'b' + b, idx: i, cond, stim, resp: go ? 'GO' : null, rt: go ? 600 : null, timeout: !go, correct: isT ? go : !go });
    });
  }
  return T;
}
const R = {
  'perfeito': c => c === 'target',
  'familiaridade (responde a alvos e iscas)': c => c !== 'nontarget',
  'mudo': () => false,
  'acaso (30%)': () => Math.random() < 0.3,
  'bom (85% alvos, 25% iscas, 3% não-alvos)': c => Math.random() < (c === 'target' ? .85 : c === 'nontarget' ? .03 : .25),
};
const out = {};
for (const [name, pol] of Object.entries(R)) {
  // média de 200 sessões para os respondedores aleatórios
  const reps = /acaso|bom/.test(name) ? 200 : 1, acc = { dprime: 0, dLure: 0, dNon: 0, crit: 0 }; let m;
  for (let k = 0; k < reps; k++) { m = nback3Metrics(session(pol)); for (const key in acc) acc[key] += m[key] / reps; }
  out[name] = { ...acc, m };
  console.log(`escore · ${name}: d′ ${f2(acc.dprime)} · contra iscas ${f2(acc.dLure)} · contra não-alvos ${f2(acc.dNon)} · c ${f2(acc.crit)}${m.ceiling ? ' · TETO' : ''}`);
}
const P = out['perfeito'].m, F = out['familiaridade (responde a alvos e iscas)'];
check(P.n === 120 && P.nTarget === 36 && P.nLure2 === 12 && P.nLure4 === 12 && P.nNon === 60 && P.nLead === 9, 'contagens da sessão de teste');
check(P.ceiling && Math.abs(P.dprime - P.dMax) < 1e-9, 'respondedor perfeito deveria estar no teto');
check(Math.abs(P.dprime - 4.73) < 0.005 && Math.abs(P.dLure - 4.26) < 0.005, `tetos citados no protocolo (4,73 / 4,26) ≠ ${f2(P.dprime)} / ${f2(P.dLure)}`);
check(P.dBlocks.length === 3, 'd′ por bloco');
check(F.dLure < 0.3 && F.dprime > 2.5 && F.dNon > 4, 'familiaridade deveria derrubar só o d′ contra iscas');
check(Math.abs(out['acaso (30%)'].dprime) < 0.15, 'acaso deveria dar d′ ≈ 0');
check(!out['mudo'].m.ceiling && out['mudo'].m.hits === 0, 'mudo');

// ── 3. resumo da sessão e integração ────────────────────────────────────
// 2-back sintético: `miss` alvos perdidos (0 = sessão no teto)
const two = miss => Array.from({ length: 70 }, (_, i) => { const cond = i % 3 === 2 ? 'target' : 'nontarget', go = cond === 'target' && i >= 3 * miss; return { module: 'nback', phase: 'test', idx: i, cond, resp: go ? 'GO' : null, rt: go ? 500 : null, timeout: !go, correct: go === (cond === 'target') }; });
const summ = (miss, pol) => computeSummary({ id: 't', date: new Date().toISOString(), device: 'teclado', screen: '1x1', durationMin: 1, modules: ['nback', 'nback3'], trials: [...two(miss), ...session(pol)] });
const sm = summ(1, R['bom (85% alvos, 25% iscas, 3% não-alvos)']);
check(sm.version === '1.2', 'versão do resumo');
check(Number.isFinite(sm.nback3.loadCost) && Math.abs(sm.nback3.loadCost - (sm.nback.dprime - sm.nback3.dprime)) < 1e-9, 'custo de carga');
// dois tetos têm d′ máximos diferentes: a diferença não pode virar "custo"
check(summ(0, R['bom (85% alvos, 25% iscas, 3% não-alvos)']).nback3.loadCost === null, 'custo de carga com 2-back no teto deveria ser nulo');
check(summ(1, R['perfeito']).nback3.loadCost === null, 'custo de carga com 3-back no teto deveria ser nulo');
check(MODULES.filter(m => m.g === 'fe').map(m => m.id).join() === 'flanker,stroop,gng,nback,nback3,span,switch', 'ordem dos módulos da sessão A');
check(INDICATORS.some(i => i.key === 'nback3.dprime') && INDICATORS.some(i => i.key === 'nback3.dLure'), 'indicadores das normas locais');
console.log(`resumo · v${sm.version} · 2-back d′ ${f2(sm.nback.dprime)} · 3-back d′ ${f2(sm.nback3.dprime)} · custo de carga ${f2(sm.nback3.loadCost)}`);

console.log(fails ? `\nRESULTADO: ${fails} FALHA(S)` : '\nRESULTADO: OK');
process.exit(fails ? 1 : 0);
