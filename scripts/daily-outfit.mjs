/**
 * 每日五行穿搭建议 CLI
 *
 * 用法:
 *   node scripts/daily-outfit.mjs                 # 今天
 *   node scripts/daily-outfit.mjs 2026-07-05      # 指定日期
 *   node scripts/daily-outfit.mjs 明天
 *
 * 命主信息读取 scripts/natal.json(不入库,模板见 natal.example.json)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bazi } from 'mingyu-core';

const here = dirname(fileURLToPath(import.meta.url));

let natal;
try {
  natal = JSON.parse(readFileSync(join(here, 'natal.json'), 'utf8'));
} catch {
  console.error('未找到 scripts/natal.json,请复制 natal.example.json 为 natal.json 并填入出生信息。');
  process.exit(1);
}

const arg = process.argv[2] ?? '今天';
let target = new Date();
if (arg === '明天') target = new Date(target.getTime() + 86400000);
else if (arg !== '今天') {
  const m = arg.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    console.error('日期格式应为 YYYY-MM-DD、今天 或 明天');
    process.exit(1);
  }
  target = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
}
const ty = target.getFullYear();
const tm = target.getMonth() + 1;
const td = target.getDate();
const dateStr = `${ty}-${String(tm).padStart(2, '0')}-${String(td).padStart(2, '0')}`;

// 1. 本命盘 → 喜用神
const chart = bazi.baziCalculator.calculateBazi(natal);
const ug = chart.analysis.usefulGod;
const dm = chart.dayMaster.gan;

// 2. 当日干支(午时取当日代表)
const day = bazi.baziCalculator.calculatePillars({
  year: ty, month: tm, day: td, timeIndex: 6, gender: natal.gender,
});
const dp = day.pillars.day;
const mp = day.pillars.month;

// 3. 五行取象 → 建议
const advice = bazi.recommendOutfit({
  favorableWuxing: [ug.primaryFavorableWuxing, ...(ug.secondaryFavorableWuxing ?? [])].filter(Boolean),
  unfavorableWuxing: [ug.primaryUnfavorableWuxing, ...(ug.secondaryUnfavorableWuxing ?? [])].filter(Boolean),
  dayGan: dp.gan,
  dayZhi: dp.zhi,
  dayMasterGan: dm,
});

const P = (x) => x.join('、');
console.log(`\n═══ ${dateStr} 五行穿搭建议 ═══`);
console.log(`命主: ${chart.pillars.year.ganZhi} ${chart.pillars.month.ganZhi} ${chart.pillars.day.ganZhi} ${chart.pillars.hour.ganZhi}(日主${dm})`);
console.log(`喜用: ${ug.favorableWuxing?.join('/')} | 忌: ${ug.unfavorableWuxing?.join('/')}(主用神:${ug.primaryFavorableWuxing})`);
console.log(`流日: ${dp.ganZhi}(流月 ${mp.ganZhi})\n`);
console.log(`🎨 主色系: ${P(advice.colors.main)}`);
console.log(`   点缀色: ${P(advice.colors.accent)}`);
console.log(`   避开:   ${P(advice.colors.avoid)}`);
console.log(`💍 配饰:   ${P(advice.accessories)}`);
console.log(`🌸 香调:   ${P(advice.scents.families)}(香材:${P(advice.scents.notes)})`);
console.log(`   避开香调: ${P(advice.scents.avoid)}`);
console.log(`\n📋 当日提示:`);
for (const n of advice.notes) console.log(`   · ${n}`);
if (day.warnings?.length) for (const w of day.warnings) console.log(`   ⚠ ${w}`);
console.log('');
