/**
 * 小程序每日颜色口径回归测试。
 *
 * today-almanac.js 是微信小程序的 CommonJS 模块；仓库根为 ESM，测试中用 vm
 * 加载纯函数，避免为了 Node 测试改变小程序运行时模块格式。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { baziCalculator } from '@core/bazi/baziCalculator';

type DayPalette = (ganZhi: string) => { el: string; lucky: string; avoid: string };

function loadDayPalette(): DayPalette {
  const source = readFileSync(
    new URL('../miniprogram/utils/today-almanac.js', import.meta.url),
    'utf8',
  );
  const module = { exports: {} as { dayPalette?: DayPalette } };
  const require = (id: string) => {
    if (id === '../lib/mingyu.js') return {};
    if (id === './colormap.js') return { WX_COLOR: {}, hexOf: () => '' };
    throw new Error(`未处理的小程序依赖：${id}`);
  };

  vm.runInNewContext(
    source,
    { module, exports: module.exports, require, Date },
    {
      filename: 'miniprogram/utils/today-almanac.js',
    },
  );
  assert.equal(typeof module.exports.dayPalette, 'function');
  return module.exports.dayPalette;
}

const dayPalette = loadDayPalette();

test('2026-08-02 戊申日：申金生水，主色应为黑蓝水系', () => {
  const result = baziCalculator.calculatePillars({
    year: 2026,
    month: 8,
    day: 2,
    timeIndex: 6,
    gender: 'male',
  });

  assert.equal(result.pillars.day.ganZhi, '戊申');
  assert.deepEqual(
    { ...dayPalette(result.pillars.day.ganZhi) },
    {
      el: '金',
      lucky: '水',
      avoid: '木',
    },
  );
});

test('已核对日期继续锁定日支口径，不回退到日干或纳音', () => {
  assert.deepEqual({ ...dayPalette('辛卯') }, { el: '木', lucky: '火', avoid: '土' });
  assert.deepEqual({ ...dayPalette('戊戌') }, { el: '土', lucky: '金', avoid: '水' });
});
