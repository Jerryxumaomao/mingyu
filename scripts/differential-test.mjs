/**
 * 双引擎差分测试:mingyu-core vs taibu-core(独立实现,底层分别为 tyme4ts / lunar-javascript)
 *
 * 原理:两个引擎对同一时刻独立排四柱,结果必须一致;唯一的已知流派差异
 * (晚子时日柱归属)被转化为显式不变量断言,而非白名单忽略。
 *
 * 用法:node scripts/differential-test.mjs
 * 环境变量:DIFF_SAMPLES(默认 10000)、DIFF_SEED(默认 20260704)
 */
import { bazi } from 'mingyu-core';
import { calculateBazi as taibuBazi } from 'taibu-core';

const SAMPLES = Number(process.env.DIFF_SAMPLES ?? 10000);
const SEED = Number(process.env.DIFF_SEED ?? 20260704);

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const JIAZI = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);
const nextJiazi = (gz) => JIAZI[(JIAZI.indexOf(gz) + 1) % 60];

// 时辰代表钟点(与 mingyu TIME_MAP 对齐,分钟固定 0,避免引擎间输入粒度差异造成假阳性)
const TIME_INDEX_HOUR = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const P = (p) => `${p.stem ?? p.gan}${p.branch ?? p.zhi}`;

const rand = mulberry32(SEED);
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

let mismatches = [];
let lateZiChecked = 0;
const t0 = Date.now();

for (let i = 0; i < SAMPLES; i++) {
  const year = randInt(1900, 2099);
  const month = randInt(1, 12);
  const day = randInt(1, daysInMonth(year, month));
  const timeIndex = randInt(0, 12);
  const hour = TIME_INDEX_HOUR[timeIndex];

  const m = bazi.baziCalculator.calculatePillars({ year, month, day, timeIndex, gender: 'male' });
  const t = taibuBazi({ birthYear: year, birthMonth: month, birthDay: day, birthHour: hour, birthMinute: 0, gender: 'male' });

  const mp = m.pillars;
  const tp = t.fourPillars;
  const input = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00 (timeIndex=${timeIndex})`;

  const problems = [];
  if (P(mp.year) !== P(tp.year)) problems.push(`年柱 mingyu=${P(mp.year)} taibu=${P(tp.year)}`);
  if (P(mp.month) !== P(tp.month)) problems.push(`月柱 mingyu=${P(mp.month)} taibu=${P(tp.month)}`);
  if (P(mp.hour) !== P(tp.hour)) problems.push(`时柱 mingyu=${P(mp.hour)} taibu=${P(tp.hour)}`);

  if (timeIndex === 12) {
    // 已知流派差异 → 双向不变量:
    // ① mingyu 默认(子初换日)日柱 = taibu(晚子时不换日)日柱的下一位
    // ② mingyu lateZiRule='same-day' 时日柱必须与 taibu 完全一致
    lateZiChecked++;
    if (P(mp.day) !== nextJiazi(P(tp.day))) {
      problems.push(`晚子时不变量① mingyu日柱=${P(mp.day)} 应为 next(taibu=${P(tp.day)})=${nextJiazi(P(tp.day))}`);
    }
    const mSame = bazi.baziCalculator.calculatePillars({ year, month, day, timeIndex, gender: 'male', lateZiRule: 'same-day' });
    if (P(mSame.pillars.day) !== P(tp.day)) {
      problems.push(`晚子时不变量② same-day日柱=${P(mSame.pillars.day)} 应等于 taibu=${P(tp.day)}`);
    }
    if (P(mSame.pillars.hour) !== P(mp.hour)) {
      problems.push(`晚子时不变量③ same-day 时柱=${P(mSame.pillars.hour)} 应与默认流派一致=${P(mp.hour)}`);
    }
  } else if (P(mp.day) !== P(tp.day)) {
    problems.push(`日柱 mingyu=${P(mp.day)} taibu=${P(tp.day)}`);
  }

  if (problems.length) mismatches.push({ input, problems });
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`差分测试完成: ${SAMPLES} 样本 / ${elapsed}s (seed=${SEED})`);
console.log(`晚子时不变量校验次数: ${lateZiChecked}`);

if (mismatches.length) {
  console.error(`\n❌ 发现 ${mismatches.length} 处双引擎分歧:`);
  for (const mm of mismatches.slice(0, 10)) {
    console.error(`  ${mm.input}`);
    for (const p of mm.problems) console.error(`    - ${p}`);
  }
  if (mismatches.length > 10) console.error(`  ... 其余 ${mismatches.length - 10} 处省略`);
  process.exit(1);
}
console.log('✅ 双引擎四柱完全一致(晚子时按流派不变量校验通过)');
