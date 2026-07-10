/**
 * 古籍命例 → 校准命例集
 *
 * 读取 extract-classic-cases.mjs 的 JSONL,应用人工复核结论
 * (剔除/改标/anyOf),再用 calculatePillars 反查四柱对应的公历日期
 * (扫描 1500-1911,书中命例多为明清人物),写入
 * tests/fixtures/strength-calibration-cases.json(与合成种子并存,source 区分)。
 *
 * 用法:node scripts/build-classic-fixture.mjs <jsonl路径>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bazi } from 'mingyu-core';

const here = dirname(fileURLToPath(import.meta.url));
const jsonlPath = process.argv[2];
if (!jsonlPath) {
  console.error('用法: node scripts/build-classic-fixture.mjs <jsonl路径>');
  process.exit(1);
}

// 人工复核结论(索引对应 JSONL 行号,复核记录见 git 提交说明)
const DROP = new Set([0, 16, 19, 56]);
const RELABEL = { 57: '强', 58: '强' };
const ANY_OF = { 18: ['强', '中和'], 65: ['强', '中和'] };

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const yearCycleIndex = (y) => (((y - 4) % 60) + 60) % 60;
const gzIndex = (gz) => {
  const g = GAN.indexOf(gz[0]);
  const z = ZHI.indexOf(gz[1]);
  for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
  return -1;
};

const P = (p) => `${p.gan}${p.zhi}`;

/** 反查:返回 [start,end] 年间所有匹配四柱的 {date, timeIndex} */
function findDates(pillars, startYear, endYear) {
  const [yGZ, mGZ, dGZ, hGZ] = pillars;
  const yIdx = gzIndex(yGZ);
  if (yIdx < 0) return [];
  const hourBranch = ZHI.indexOf(hGZ[1]);
  const timeIndexes = hourBranch === 0 ? [0, 12] : [hourBranch];
  const matches = [];
  for (let y = startYear; y <= endYear; y++) {
    if (yearCycleIndex(y) !== yIdx) continue;
    // 该干支年跨度约为公历 y-02-04 ~ (y+1)-02-04
    const from = Date.UTC(y, 1, 1);
    const to = Date.UTC(y + 1, 1, 20);
    for (let t = from; t <= to; t += 86400000) {
      const d = new Date(t);
      for (const ti of timeIndexes) {
        let r;
        try {
          r = bazi.baziCalculator.calculatePillars({
            year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
            timeIndex: ti, gender: 'male',
          });
        } catch { continue; }
        const pp = r.pillars;
        if (P(pp.year) === yGZ && P(pp.month) === mGZ && P(pp.day) === dGZ && P(pp.hour) === hGZ) {
          matches.push({
            year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), timeIndex: ti,
          });
        }
      }
    }
  }
  return matches;
}

const rows = readFileSync(jsonlPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const out = [];
const unmatched = [];
rows.forEach((c, i) => {
  if (DROP.has(i)) return;
  const expected = ANY_OF[i] ?? RELABEL[i] ?? c.expected;
  const matches = findDates(c.pillars, 1500, 1911);
  if (!matches.length) {
    unmatched.push({ i, pillars: c.pillars });
    return;
  }
  // 多个甲子轮回匹配时,取 1600-1860(任铁樵所处及之前年代)内最近的一个
  const preferred =
    matches.filter((m) => m.year >= 1600 && m.year <= 1860).pop() ?? matches[matches.length - 1];
  out.push({
    desc: `${c.pillars.join(' ')} | ${c.book}#${i} ${c.keyword}`,
    source: { book: c.book, index: i, keyword: c.keyword, quote: c.quote },
    person: { ...preferred, gender: 'male' },
    pillars: c.pillars,
    expected,
    matchedDates: matches.map((m) => `${m.year}-${m.month}-${m.day}@${m.timeIndex}`),
  });
  console.error(`#${i} [${Array.isArray(expected) ? expected.join('/') : expected}] ${c.pillars.join(' ')} → ${preferred.year}-${preferred.month}-${preferred.day} ti=${preferred.timeIndex} (${matches.length} 个候选)`);
});

const fixturePath = join(here, '../tests/fixtures/strength-calibration-cases.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
fixture.cases = [
  ...fixture.cases.filter((c) => !c.source), // 保留合成种子
  ...out,
];
fixture._classicNote =
  '古籍命例取自《滴天髓阐微》(殆知阁公版语料),标签来自任铁樵批语的明确旺衰定论,经人工逐条复核(剔除反问/驳论/假设句误抓);公历日期由四柱反查(1500-1911),多轮回时取 1600-1860 内最近者;女命按 male 处理(强弱评分与性别无关,仅大运排向受影响)。';
writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
console.error(`\n写入 ${out.length} 例古籍命例(未匹配到日期 ${unmatched.length} 例)`);
if (unmatched.length) console.error('未匹配:', JSON.stringify(unmatched));
