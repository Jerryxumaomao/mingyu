/**
 * 岁运联动经典组合测试 + 用神多流派输出测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeLiunianInteractions } from '@core/bazi/liunianInteractions';
import { baziCalculator } from '@core/bazi/baziCalculator';
import type { Pillars } from '@core/bazi/baziTypes';

const P = (year: string, month: string, day: string, hour: string): Pillars => {
  const mk = (gz: string) => ({ gan: gz[0], zhi: gz[1], ganZhi: gz });
  return { year: mk(year), month: mk(month), day: mk(day), hour: mk(hour) };
};

// 丙子 乙亥 甲子 丙寅,日主甲(可见天干:食神/劫财/食神,无官伤)
const CHART = P('丙子', '乙亥', '甲子', '丙寅');

const ids = (list: { id: string }[]) => list.map((x) => x.id);

test('岁运并临:流年与大运同干支', () => {
  const r = analyzeLiunianInteractions({
    pillars: CHART, dayMaster: '甲', liunianGanZhi: '戊寅', dayunGanZhi: '戊寅',
  });
  assert.ok(ids(r).includes('sui-yun-bing-lin'));
});

test('天克地冲:庚午年克甲冲子', () => {
  const r = analyzeLiunianInteractions({ pillars: CHART, dayMaster: '甲', liunianGanZhi: '庚午' });
  assert.ok(ids(r).includes('tian-ke-di-chong'));
});

test('比劫夺财:流年偏财遇原局比劫', () => {
  const r = analyzeLiunianInteractions({ pillars: CHART, dayMaster: '甲', liunianGanZhi: '戊辰' });
  assert.ok(ids(r).includes('bi-jie-duo-cai'));
});

test('枭神夺食:流年偏印遇原局食神', () => {
  const r = analyzeLiunianInteractions({ pillars: CHART, dayMaster: '甲', liunianGanZhi: '壬辰' });
  assert.ok(ids(r).includes('xiao-shen-duo-shi'));
});

test('冲提纲:巳年冲亥月', () => {
  const r = analyzeLiunianInteractions({ pillars: CHART, dayMaster: '甲', liunianGanZhi: '己巳' });
  assert.ok(ids(r).includes('chong-ti-gang'));
});

test('伤官见官:原局透伤官,流年正官引动', () => {
  const chart = P('丁卯', '乙巳', '甲子', '庚午');
  const r = analyzeLiunianInteractions({ pillars: chart, dayMaster: '甲', liunianGanZhi: '辛丑' });
  assert.ok(ids(r).includes('shang-guan-jian-guan'));
});

test('羊刃逢冲:甲刃在卯,酉年冲之', () => {
  const chart = P('丁卯', '乙巳', '甲子', '丙寅');
  const r = analyzeLiunianInteractions({ pillars: chart, dayMaster: '甲', liunianGanZhi: '癸酉' });
  assert.ok(ids(r).includes('yang-ren-feng-chong'));
});

test('平静流年:无组合时返回空', () => {
  const r = analyzeLiunianInteractions({ pillars: CHART, dayMaster: '甲', liunianGanZhi: '丁丑' });
  assert.deepEqual(r, []);
});

test('用神多流派输出:调候applied/扶抑快照/分歧标志', () => {
  const chart = baziCalculator.calculateBazi({
    year: 1996, month: 11, day: 23, timeIndex: 2, gender: 'male',
  });
  const schools = (chart.analysis.usefulGod as { schools?: {
    fuyi: { favorableWuxing: string[]; primary: string };
    tiaohou: { applied: boolean; favorableWuxing: string[]; primary: string };
    diverged: boolean;
  } }).schools;
  assert.ok(schools, 'usefulGod 应包含 schools 字段');
  assert.equal(schools!.tiaohou.applied, true, '甲木亥月应触发调候');
  assert.equal(schools!.tiaohou.primary, '火', '调候首选丙火');
  assert.ok(schools!.fuyi.favorableWuxing.length > 0, '扶抑派结论应有快照');
  assert.equal(typeof schools!.diverged, 'boolean');
});
