/**
 * 每日五行开运卡 · 视频渲染流水线
 *
 * 引擎(mingyu-core)算流日五行/十神/宜忌色 → 写 vars.js 进 hyperframes 组合
 * → 无头渲染为带 alpha 的 ProRes MOV(1080×1920,3.2s),可直接叠进小红书成片。
 *
 * 用法:
 *   node scripts/render-daily-card.mjs            # 今天,1 张
 *   node scripts/render-daily-card.mjs 明天
 *   node scripts/render-daily-card.mjs 2026-07-15 7   # 从该日起连渲 7 天(日更弹药)
 *
 * 依赖(见 D:/Claude/Tools/hyperframes-studio/README.md):
 *   本机 headless Chrome 路径 + HYPERFRAMES_NO_AUTO_INSTALL=1(勿走自动下载)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bazi } from 'mingyu-core';

const here = dirname(fileURLToPath(import.meta.url));
const STUDIO = 'D:/Claude/Tools/hyperframes-studio';
const COMP = join(STUDIO, 'wuxing-daily');
const CLI = join(STUDIO, 'node_modules/hyperframes/dist/cli.js');
const CHROME = 'D:/Claude/Tools/hyperframes-chrome/chrome-headless-shell-win64/chrome-headless-shell.exe';
const OUT_DIR = join(COMP, 'renders');

// 五行取象色名 → 视频色板(与 WUXING_IMAGERY 的主色名对齐)
const HEX = {
  红色: '#C03A2B', 橙色: '#D97B29', 紫色: '#7A4E9E', 酒红: '#8E2F2F', 砖红: '#B4472F', 赤陶色: '#D1553F', 亮粉: '#E06A8A',
  黄色: '#D4A94E', 棕色: '#8A5A2B', 驼色: '#B98A4A', 米色: '#D8C9A3', 卡其: '#A08A5A', 焦糖: '#B5762F', 姜黄: '#C98F2A',
  绿色: '#3E7C4F', 青色: '#2F7C6E', 原木色: '#A98F6B', 薄荷绿: '#7FBFA0', 橄榄绿: '#6B7C3E',
  白色: '#EFEFEA', 银色: '#C9CDD3', 金色: '#D4A94E', 金属灰: '#9AA0A8', 香槟色: '#D9C6A0',
  黑色: '#23262B', 藏蓝: '#2B3A5C', 深蓝: '#274B6D', 雾蓝: '#7A8FA8', 灰蓝: '#5F7286',
};
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

let natal;
try {
  natal = JSON.parse(readFileSync(join(here, 'natal.json'), 'utf8'));
} catch {
  console.error('未找到 scripts/natal.json(命主档案),请先按 natal.example.json 配置。');
  process.exit(1);
}

const arg = process.argv[2] ?? '今天';
const days = Math.max(1, parseInt(process.argv[3] ?? '1', 10) || 1);
let start = new Date();
if (arg === '明天') start = new Date(start.getTime() + 86400000);
else if (arg !== '今天') {
  const m = arg.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) { console.error('日期格式:YYYY-MM-DD / 今天 / 明天'); process.exit(1); }
  start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
}

// 本命喜忌(一次)
const chart = bazi.baziCalculator.calculateBazi(natal);
const ug = chart.analysis.usefulGod;
const dm = chart.dayMaster.gan;
const favorable = ug.favorableWuxing ?? [];
const unfavorable = ug.unfavorableWuxing ?? [];

mkdirSync(OUT_DIR, { recursive: true });
const results = [];

for (let i = 0; i < days; i++) {
  const d = new Date(start.getTime() + i * 86400000);
  const [y, mo, da] = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;

  const day = bazi.baziCalculator.calculatePillars({ year: y, month: mo, day: da, timeIndex: 6, gender: natal.gender });
  const dp = day.pillars.day;
  const adv = bazi.recommendOutfit({
    favorableWuxing: favorable, unfavorableWuxing: unfavorable,
    dayGan: dp.gan, dayZhi: dp.zhi, dayMasterGan: dm,
  });

  const lucky = adv.colors.main.slice(0, 3).map((name) => ({ name, hex: HEX[name] ?? '#D4A94E' }));
  while (lucky.length < 3) lucky.push(lucky[lucky.length - 1]);
  const avoidName = adv.colors.avoid[0] ?? '无';
  const avoid = { name: `忌${avoidName}`, hex: HEX[avoidName] ?? '#3E7C4F' };

  const ganGod = bazi.baziCalculator.getTenGod(dp.gan, dm);
  const zhiGod = bazi.baziCalculator.getTenGodForBranch(dp.zhi, dm);
  const zhiEl = bazi.getWuxing ? bazi.getWuxing(dp.zhi) : '';
  // 提示语:忌神当值给通关口径,否则给主色鼓励
  let tip;
  const zhiWuxing = adv.notes.find((n) => n.includes('通关'));
  if (zhiWuxing) {
    const drain = SHENG[unfavorable[0]] ?? favorable[0];
    tip = `地支${dp.zhi}为忌,${drain}色通关,今天暖色加重`;
  } else {
    tip = `主用${favorable[0] ?? ''}色大胆用 · 细节看主页穿搭`;
  }

  const vars = {
    dateText: `${dateStr} · 农历${day.lunarDate.monthName}${day.lunarDate.dayName}`,
    ganzhi: dp.ganZhi,
    tenGod: `${ganGod} · ${zhiGod}`,
    lucky,
    avoid,
    tip,
  };
  writeFileSync(join(COMP, 'vars.js'), `window.__CARD_VARS = ${JSON.stringify(vars)};\n`);

  const out = join(OUT_DIR, `${dateStr}.mov`);
  console.log(`▶ 渲染 ${dateStr}(${dp.ganZhi} · ${ganGod})→ ${out}`);
  const r = spawnSync('node', [CLI, 'render', '.', '--format', 'mov', '-o', out], {
    cwd: COMP,
    env: { ...process.env, HYPERFRAMES_BROWSER_PATH: CHROME, HYPERFRAMES_NO_AUTO_INSTALL: '1' },
    stdio: 'inherit',
    timeout: 180000,
  });
  if (r.status !== 0) { console.error(`❌ ${dateStr} 渲染失败(exit ${r.status})`); process.exit(1); }
  results.push(out);
}

console.log(`\n✅ 完成 ${results.length} 张开运卡:`);
for (const f of results) console.log('  ', f);
console.log('叠加进成片:ffmpeg -i 底.mp4 -i 卡.mov -filter_complex "[1]format=rgba[fg];[0][fg]overlay=format=auto" ...');
