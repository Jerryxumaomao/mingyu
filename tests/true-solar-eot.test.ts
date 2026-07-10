/**
 * NOAA 均时差精度 + utcOffset 时区行为测试
 * 金标准值取自 NOAA Solar Calculator(容差 ±0.5 分钟,远高于旧一阶近似的 ±2 分钟)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateEquationOfTimeMinutes, calculateTrueSolarTime } from '@core/bazi/trueSolarTime';
import { baziCalculator } from '@core/bazi/baziCalculator';

const approx = (actual: number, expected: number, tol: number, msg: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: 期望 ${expected}±${tol},实得 ${actual.toFixed(2)}`);

test('均时差:NOAA 金标准四点校验(2024)', () => {
  approx(calculateEquationOfTimeMinutes(2024, 2, 11), -14.2, 0.5, '2月11日(全年最负)');
  approx(calculateEquationOfTimeMinutes(2024, 7, 26), -6.5, 0.5, '7月26日(夏季低谷)');
  approx(calculateEquationOfTimeMinutes(2024, 11, 3), 16.4, 0.5, '11月3日(全年最正)');
  approx(calculateEquationOfTimeMinutes(2024, 4, 15), 0, 0.6, '4月15日(过零点)');
});

test('均时差:跨世纪稳定性(1950/2050 极值日不漂移)', () => {
  approx(calculateEquationOfTimeMinutes(1950, 11, 3), 16.4, 0.7, '1950-11-03');
  approx(calculateEquationOfTimeMinutes(2050, 2, 11), -14.2, 0.7, '2050-02-11');
});

test('utcOffset:美东出生(西五区)经度校正按 -75° 标准经线', () => {
  const r = calculateTrueSolarTime(
    { year: 2000, month: 6, day: 15, hour: 12, minute: 0 },
    -74,
    -5 * 15,
  );
  assert.equal(r.longitudeCorrectionMinutes, 4, '(-74 - (-75)) × 4 = +4 分钟');
});

test('utcOffset:非东八区自动跳过中国夏令时校正', () => {
  const r = baziCalculator.calculatePillars({
    year: 1988, month: 7, day: 15, timeIndex: 0, gender: 'male',
    useTrueSolarTime: true, birthHour: 12, birthMinute: 0,
    birthLongitude: 139.7, utcOffset: 9,
  });
  assert.ok(!r.timing?.dstCorrectionMinutes, '东九区不应触发中国夏令时回拨');
});

test('utcOffset:经度与时区标准经线相差超 30° 时输出预警', () => {
  const r = baziCalculator.calculatePillars({
    year: 2000, month: 6, day: 15, timeIndex: 0, gender: 'male',
    useTrueSolarTime: true, birthHour: 12, birthMinute: 0,
    birthLongitude: -74,
  });
  assert.ok(
    r.warnings.some((w) => w.includes('相差超过 30°')),
    '纽约经度配默认东八区应预警',
  );
});
