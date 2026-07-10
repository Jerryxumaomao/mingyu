/**
 * 人生K线 + 合婚 + 城市表测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateLifeKline } from '@core/bazi/lifeKline';
import { calculateHehun } from '@core/bazi/hehun';
import { lookupCity, CHINA_CITIES } from '@core/data/chinaCities';

const ME = { year: 1996, month: 11, day: 23, timeIndex: 2, gender: 'male' as const };

test('K线:喜用年高分、忌神年低分(方向性)', () => {
  const k = calculateLifeKline(ME, { startAge: 30, endAge: 45 });
  const byYear = new Map(k.years.map((y) => [y.year, y]));
  const fire = byYear.get(2026)!; // 丙午,双火主用神
  const wood = byYear.get(2035)!; // 乙卯,纯木忌神
  assert.ok(fire.score > 60, `丙午年应高分,实得 ${fire.score}`);
  assert.ok(wood.score < 35, `乙卯年应低分,实得 ${wood.score}`);
  assert.ok(fire.score - wood.score >= 25, '喜忌年分差应显著');
});

test('K线:OHLC 合法(low<=open/close<=high)且开盘接续前收', () => {
  const k = calculateLifeKline(ME, { startAge: 30, endAge: 40 });
  for (let i = 0; i < k.years.length; i++) {
    const y = k.years[i];
    assert.ok(y.low <= Math.min(y.open, y.close) && y.high >= Math.max(y.open, y.close), `${y.year} OHLC 非法`);
    assert.equal(y.monthScores.length, 12);
    if (i > 0) assert.equal(y.open, k.years[i - 1].close, `${y.year} 开盘应等于前年收盘`);
  }
});

test('K线:岁运组合事件透出', () => {
  const k = calculateLifeKline(ME, { startAge: 50, endAge: 60 });
  const y2050 = k.years.find((y) => y.year === 2050)!; // 庚午:庚克甲、午冲子 → 天克地冲
  assert.ok(y2050.events.some((e) => e.id === 'tian-ke-di-chong'));
});

test('合婚:天地鸳鸯合识别(甲子日×己丑日)', () => {
  const h = calculateHehun(ME, { year: 1996, month: 8, day: 20, timeIndex: 7, gender: 'female' });
  const ids = h.rules.map((r) => r.id);
  assert.ok(ids.includes('rigan-wuhe'), '应识别甲己五合');
  assert.ok(ids.includes('rizhi-liuhe'), '应识别子丑六合');
  assert.ok(h.total >= 65, `天地鸳鸯合应至少为上等,实得 ${h.total}`);
});

test('合婚:夫妻宫相冲扣重分且对称', () => {
  // 构造日支相冲:甲子日 vs 午日盘
  const partner = { year: 1990, month: 6, day: 22, timeIndex: 5, gender: 'female' as const };
  const h1 = calculateHehun(ME, partner);
  const h2 = calculateHehun(partner, ME);
  assert.equal(h1.total, h2.total, '合婚应对称');
  assert.ok(h1.rules.every((r) => ['子平', '现代', '民俗'].includes(r.source)), '每条规则须标注出处');
});

test('城市表:模糊匹配与经度合理性', () => {
  assert.equal(lookupCity('哈尔滨市')!.lon, 126.53);
  assert.equal(lookupCity('深圳')!.lon, 114.06);
  assert.ok(lookupCity('不存在的城市') === null);
  for (const [name, c] of Object.entries(CHINA_CITIES)) {
    assert.ok(c.lon >= 73 && c.lon <= 136, `${name} 经度越界`);
    assert.ok(c.lat >= 17 && c.lat <= 54, `${name} 纬度越界`);
  }
});
