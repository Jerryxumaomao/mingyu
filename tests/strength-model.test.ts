/**
 * 强弱分档模型测试:legacy 默认零变化;classic-calibrated 按古籍校准阈值分档
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { baziCalculator } from '@core/bazi/baziCalculator';

test('默认(legacy)行为不变:金标准盘(丙子己亥甲子丙寅)判偏强 4.7', () => {
  // 分数含上游 0.1.15 新增的 commanderScore(月令司令计入,亥月壬水司令生甲木 +1)
  const r = baziCalculator.calculateBazi({
    year: 1996, month: 11, day: 23, timeIndex: 2, gender: 'male',
  });
  assert.equal(r.analysis.dayMasterStrength.status, '偏强');
  assert.equal(r.analysis.dayMasterStrength.score, 4.7);
  assert.equal(r.analysis.dayMasterStrength.details.commanderScore, 1);
});

test('classic-calibrated:滴天髓#63(己丑 丙子 辛酉 壬辰,任注"日元旺")由身弱改判强类', () => {
  const person = { year: 1829, month: 12, day: 26, timeIndex: 4, gender: 'male' as const };
  const legacy = baziCalculator.calculateBazi(person);
  assert.equal(legacy.analysis.dayMasterStrength.status, '身弱', 'legacy 误判为身弱');
  const cal = baziCalculator.calculateBazi({ ...person, strengthModel: 'classic-calibrated' });
  assert.ok(
    ['偏强', '身强'].includes(cal.analysis.dayMasterStrength.status),
    `calibrated 应判强类,实得 ${cal.analysis.dayMasterStrength.status}`,
  );
  assert.equal(
    legacy.analysis.dayMasterStrength.score,
    cal.analysis.dayMasterStrength.score,
    '两模型评分应一致,只有分档不同',
  );
});

test('classic-calibrated:从格极弱盘仍判弱类(阈值下移不误伤)', () => {
  // 滴天髓#64 癸亥 乙卯 戊午 甲寅,从杀,引擎 -10.3
  const r = baziCalculator.calculateBazi({
    year: 1803, month: 3, day: 15, timeIndex: 2, gender: 'male',
    strengthModel: 'classic-calibrated',
  });
  assert.ok(['身弱', '偏弱', '极弱'].includes(r.analysis.dayMasterStrength.status));
});

test('1600 年下限:历史日期可排盘(乾隆金标准),1599 拒绝', () => {
  const r = baziCalculator.calculatePillars({
    year: 1711, month: 9, day: 25, timeIndex: 0, gender: 'male',
  });
  const p = r.pillars;
  assert.equal(
    `${p.year.ganZhi} ${p.month.ganZhi} ${p.day.ganZhi} ${p.hour.ganZhi}`,
    '辛卯 丁酉 庚午 丙子',
    '乾隆帝史载八字',
  );
  assert.throws(
    () => baziCalculator.calculatePillars({ year: 1599, month: 1, day: 1, timeIndex: 0, gender: 'male' }),
    /1600-2100/,
  );
});
