/**
 * 日主强弱阈值校准工具
 *
 * 读取 tests/fixtures/strength-calibration-cases.json(标注命例),
 * 报告引擎当前判定与标签的吻合度,并对三分类阈值做网格扫描,
 * 给出吻合度最高的阈值组合(advisory,不自动改代码)。
 *
 * 用法:node scripts/calibrate-strength.mjs
 * 注意:随附种子命例为合成粗标签,正式校准请补充古籍带定论命例。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bazi } from 'mingyu-core';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, '../tests/fixtures/strength-calibration-cases.json'), 'utf8'),
);

const toCoarse = (status) =>
  ['极强', '身强', '偏强'].includes(status) ? '强' : status === '中和' ? '中和' : '弱';

// expected 支持字符串或数组(anyOf,如"日主不弱"→['强','中和'])
const hits = (coarse, expected) =>
  Array.isArray(expected) ? expected.includes(coarse) : coarse === expected;

const rows = fixture.cases.map((c) => {
  const r = bazi.baziCalculator.calculateBazi(c.person);
  const s = r.analysis.dayMasterStrength;
  return {
    ...c,
    score: s.score,
    status: s.status,
    coarse: toCoarse(s.status),
    group: c.source ? c.source.book : '合成种子',
  };
});

console.log(`\n══ 强弱校准报告(${rows.length} 例)══\n`);
const groups = [...new Set(rows.map((r) => r.group))];
for (const g of groups) {
  const rs = rows.filter((r) => r.group === g);
  let hit = 0;
  for (const r of rs) {
    const ok = hits(r.coarse, r.expected);
    if (ok) hit++;
    const exp = Array.isArray(r.expected) ? r.expected.join('/') : r.expected;
    console.log(`${ok ? '✅' : '❌'} [标签:${exp}] 引擎:${r.status}(${r.score})  ${r.desc}`);
  }
  console.log(`—— ${g}: ${hit}/${rs.length} = ${((hit / rs.length) * 100).toFixed(0)}% ——\n`);
}
const totalHit = rows.filter((r) => hits(r.coarse, r.expected)).length;
console.log(`总吻合度(三分类): ${totalHit}/${rows.length} = ${((totalHit / rows.length) * 100).toFixed(0)}%`);

// classic-calibrated 模型对比
const calRows = fixture.cases.map((c) => {
  const r = bazi.baziCalculator.calculateBazi({ ...c.person, strengthModel: 'classic-calibrated' });
  const s = r.analysis.dayMasterStrength;
  return { expected: c.expected, coarse: toCoarse(s.status), group: c.source ? c.source.book : '合成种子' };
});
const calHit = calRows.filter((r) => hits(r.coarse, r.expected)).length;
console.log(`classic-calibrated 模型吻合度: ${calHit}/${calRows.length} = ${((calHit / calRows.length) * 100).toFixed(0)}%`);
for (const g of groups) {
  const rs = calRows.filter((r) => r.group === g);
  const h = rs.filter((r) => hits(r.coarse, r.expected)).length;
  console.log(`  ${g}: ${h}/${rs.length} = ${((h / rs.length) * 100).toFixed(0)}%`);
}

// 阈值网格扫描:score >= tStrong → 强;score <= tWeak → 弱;否则中和
let best = [];
for (let tStrong = 0; tStrong <= 6; tStrong += 0.5) {
  for (let tWeak = -5; tWeak < tStrong; tWeak += 0.5) {
    const acc = rows.filter(
      (r) => (r.score >= tStrong ? '强' : r.score <= tWeak ? '弱' : '中和') === r.expected,
    ).length;
    best.push({ tStrong, tWeak, acc });
  }
}
best.sort((a, b) => b.acc - a.acc);
console.log('\n阈值网格扫描 Top 5(现行为 强≥4 / 弱≤2.5 下界近似):');
for (const b of best.slice(0, 5)) {
  console.log(
    `  强≥${b.tStrong} / 弱≤${b.tWeak} → ${b.acc}/${rows.length} = ${((b.acc / rows.length) * 100).toFixed(0)}%`,
  );
}
console.log(
  '\n说明:扫描只重排阈值,无法修正评分本身的系统性偏差;若最优阈值明显偏离现行值,' +
    '说明 constraint/support 权重需要再平衡(见 baziStrengthAnalyzer.ts),请在扩充古籍命例后再决策。\n',
);
