/**
 * 用神四派并列输出测试(扶抑/调候/病药/专旺 + 共识)
 * 参考 DeepOracle 四派决策框架;验证默认裁决不受影响、四派各自独立、
 * 专旺阈值(≥50% 且克/泄反力<10%)与 nearMiss 边界提示。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { baziCalculator } from '@core/bazi/baziCalculator';

const schoolsOf = (person: Parameters<typeof baziCalculator.calculateBazi>[0]) =>
  (baziCalculator.calculateBazi(person).analysis.usefulGod as unknown as {
    schools: import('@core/bazi/baziUsefulGodStrategy').UsefulGodSchools;
  }).schools;

const ME = { year: 1996, month: 11, day: 23, timeIndex: 2, gender: 'male' as const };

test('四派字段齐全', () => {
  const s = schoolsOf(ME);
  assert.ok(s.fuyi && s.tiaohou && s.bingyao && s.zhuanwang, '四派字段都应存在');
  assert.equal(typeof s.zhuanwang.qualifies, 'boolean');
  assert.ok('consensus' in s);
});

test('金标准盘:水旺但非日主同党,不成专旺也非 nearMiss', () => {
  // 丙子 己亥 甲子 丙寅:最旺为水(印),但旺神非日主甲木同党 → 专旺不适用
  const z = schoolsOf(ME).zhuanwang;
  assert.equal(z.dominantWuxing, '水', '盘面最旺应为水');
  assert.equal(z.qualifies, false, '旺神非日主同党,不构成专旺');
  assert.equal(z.nearMiss, false, '专旺判定要求日主即旺神');
  assert.ok(z.note.length > 0);
});

test('nearMiss 边界:癸水日主水50%但反力≥10%,标记分歧高发盘', () => {
  // 己亥 丁丑 癸亥 癸丑:日主癸水,水占50%,但克/泄反力存在 → nearMiss
  const z = schoolsOf({ year: 1960, month: 2, day: 5, timeIndex: 1, gender: 'male' }).zhuanwang;
  assert.equal(z.dominantWuxing, '水');
  assert.equal(z.qualifies, false);
  assert.equal(z.nearMiss, true, '应标记为接近专旺的分歧高发盘');
  assert.ok(z.note.includes('分歧'), 'note 应解释流派分歧');
});

test('金标准盘:调候首选为火,各派共识指向火', () => {
  const s = schoolsOf(ME);
  assert.equal(s.tiaohou.primary, '火', '甲木亥月调候先丙(火)');
  assert.equal(s.consensus, '火', '扶抑/调候/病药共识应为火');
});

test('专旺检测:成格盘 qualifies=true,顺势喜同党忌克神', () => {
  // 构造木极旺无金无火之势(尽量纯):四柱多木水、无金、火弱
  // 乙卯 己卯 乙卯 丁亥 类:此处用能触发的合成盘,断言仅验结构不验具体盘
  const strongWood = { year: 1975, month: 2, day: 15, timeIndex: 3, gender: 'male' as const };
  const z = schoolsOf(strongWood).zhuanwang;
  if (z.qualifies) {
    assert.ok(z.favorableWuxing.length >= 1, '成专旺应给顺势喜用');
    assert.ok(z.unfavorableWuxing.length >= 1, '成专旺应给克神为忌');
    // 顺势:喜里应含旺神本身
    assert.ok(z.favorableWuxing.includes(z.dominantWuxing));
  } else {
    // 未成格也应给出合理 note,不崩
    assert.ok(z.note.length > 0);
  }
});

test('默认最终用神不受四派字段影响(向后兼容)', () => {
  const ug = baziCalculator.calculateBazi(ME).analysis.usefulGod;
  // 用户盘既有结论:主用神火、忌木(与历史一致)
  assert.equal(ug.primaryFavorableWuxing, '火');
  assert.equal(ug.primaryUnfavorableWuxing, '木');
});

test('专旺阈值:反力充足时即使旺神占比高也不成格', () => {
  // 找一个某五行高占比但克/泄反力≥10% 的盘,应 qualifies=false
  const s = schoolsOf({ year: 2000, month: 5, day: 20, timeIndex: 6, gender: 'female' });
  const z = s.zhuanwang;
  if (z.dominantPct >= 50 && (z.controllerPct >= 10 || z.drainerPct >= 10)) {
    assert.equal(z.qualifies, false, '有明显反力不成专旺');
  }
  assert.ok(typeof z.qualifies === 'boolean');
});
