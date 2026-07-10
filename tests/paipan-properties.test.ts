/**
 * 排盘属性测试(property-based)
 * 不依赖外部"标准答案",验证干支系统自身的数学不变量:
 * 日柱逐日 +1、六十甲子循环、五鼠遁时柱公式、立春换年、晚子时流派关系。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { baziCalculator } from '@core/bazi/baziCalculator';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const JIAZI = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);
const nextJiazi = (gz: string) => JIAZI[(JIAZI.indexOf(gz) + 1) % 60];
const prevJiazi = (gz: string) => JIAZI[(JIAZI.indexOf(gz) + 59) % 60];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260704);
const randInt = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const pillarsAt = (d: Date, timeIndex = 6, extra: Record<string, unknown> = {}) =>
  baziCalculator.calculatePillars({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    timeIndex,
    gender: 'male',
    ...extra,
  }).pillars;

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const randomDate = () =>
  new Date(Date.UTC(randInt(1901, 2098), randInt(0, 11), randInt(1, 28)));

test('属性:日柱在任意连续区间内严格逐日 +1(六十甲子序)', () => {
  for (let w = 0; w < 12; w++) {
    const start = randomDate();
    let prev = pillarsAt(start).day.ganZhi;
    for (let i = 1; i <= 61; i++) {
      const cur = pillarsAt(addDays(start, i)).day.ganZhi;
      assert.equal(
        cur,
        nextJiazi(prev),
        `${start.toISOString().slice(0, 10)} +${i} 日柱应为 ${nextJiazi(prev)},实得 ${cur}`,
      );
      prev = cur;
    }
  }
});

test('属性:日柱以 60 为周期循环,59 天必不同', () => {
  for (let w = 0; w < 20; w++) {
    const d = randomDate();
    const base = pillarsAt(d).day.ganZhi;
    assert.equal(pillarsAt(addDays(d, 60)).day.ganZhi, base);
    assert.notEqual(pillarsAt(addDays(d, 59)).day.ganZhi, base);
  }
});

test('属性:时柱天干符合五鼠遁公式(由日干与时支唯一决定)', () => {
  for (let i = 0; i < 300; i++) {
    const d = randomDate();
    const timeIndex = randInt(0, 12);
    const p = pillarsAt(d, timeIndex);
    const dayIdx = GAN.indexOf(p.day.gan);
    const branchIdx = ZHI.indexOf(p.hour.zhi);
    const expectedStem = GAN[((dayIdx % 5) * 2 + branchIdx) % 10];
    assert.equal(
      p.hour.gan,
      expectedStem,
      `${d.toISOString().slice(0, 10)} timeIndex=${timeIndex}: ${p.day.gan}日${p.hour.zhi}时 时干应为 ${expectedStem},实得 ${p.hour.gan}`,
    );
  }
});

test('属性:年柱以立春为界——12/31 与次年 1/1 同年柱,1/1 与同年 12/31 必不同', () => {
  for (let i = 0; i < 12; i++) {
    const y = randInt(1901, 2097);
    const dec31 = pillarsAt(new Date(Date.UTC(y, 11, 31))).year.ganZhi;
    const jan1Next = pillarsAt(new Date(Date.UTC(y + 1, 0, 1))).year.ganZhi;
    const jan1Same = pillarsAt(new Date(Date.UTC(y, 0, 1))).year.ganZhi;
    assert.equal(dec31, jan1Next, `${y}-12-31 与 ${y + 1}-01-01 应同年柱(均在立春后/前同段)`);
    assert.notEqual(jan1Same, dec31, `${y}-01-01 与 ${y}-12-31 跨立春,年柱应不同`);
  }
});

test('属性:晚子时流派——same-day 日柱为默认流派前一位,时柱不变;非晚子时两流派全同', () => {
  for (let i = 0; i < 60; i++) {
    const d = randomDate();
    const def = pillarsAt(d, 12);
    const same = pillarsAt(d, 12, { lateZiRule: 'same-day' });
    assert.equal(same.day.ganZhi, prevJiazi(def.day.ganZhi));
    assert.equal(same.hour.ganZhi, def.hour.ganZhi);
    assert.equal(same.year.ganZhi, def.year.ganZhi);
    assert.equal(same.month.ganZhi, def.month.ganZhi);

    const ti = randInt(0, 11);
    const a = pillarsAt(d, ti);
    const b = pillarsAt(d, ti, { lateZiRule: 'same-day' });
    assert.deepEqual(a, b, '非晚子时两流派必须完全一致');
  }
});
