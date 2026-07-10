/**
 * 五行取象穿搭建议测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { recommendOutfit, WUXING_IMAGERY } from '@core/bazi/outfitAdvisor';

test('喜火忌木:主色为火系,避开木系', () => {
  const r = recommendOutfit({ favorableWuxing: ['火', '土'], unfavorableWuxing: ['木'] });
  assert.equal(r.mainElement, '火');
  assert.ok(r.colors.main.includes('红色'));
  assert.ok(r.colors.avoid.includes('绿色'));
  assert.ok(r.scents.families.includes('辛香调'));
  assert.ok(r.scents.avoid.includes('绿叶调'));
});

test('通关提示:地支忌神所生五行为喜用时给出通关建议', () => {
  // 甲日主,忌木喜火:戊寅日 → 寅木为忌,木生火,火为喜 → 应提示以火通关
  const r = recommendOutfit({
    favorableWuxing: ['火', '土'],
    unfavorableWuxing: ['木'],
    dayGan: '戊',
    dayZhi: '寅',
    dayMasterGan: '甲',
  });
  assert.ok(r.notes.some((n) => n.includes('通关')), '应包含通关提示');
  assert.ok(r.notes.some((n) => n.includes('偏财')), '戊对甲应为偏财');
});

test('地支为喜时不给通关提示', () => {
  const r = recommendOutfit({
    favorableWuxing: ['火', '土'],
    unfavorableWuxing: ['木'],
    dayGan: '丁',
    dayZhi: '丑',
    dayMasterGan: '甲',
  });
  assert.ok(!r.notes.some((n) => n.includes('通关')));
});

test('取象表:五行齐全且色系互不重叠', () => {
  const all = Object.values(WUXING_IMAGERY).flatMap((v) => v.colors);
  assert.equal(new Set(all).size, all.length, '主色不应跨五行重复');
  assert.equal(Object.keys(WUXING_IMAGERY).length, 5);
});

test('非法五行输入被安全过滤', () => {
  const r = recommendOutfit({ favorableWuxing: ['雷', '火'], unfavorableWuxing: ['风'] });
  assert.equal(r.mainElement, '火');
  assert.deepEqual(r.colors.avoid, []);
});
