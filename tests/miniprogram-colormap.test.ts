/** 小程序色名映射回归测试。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

type ColorMap = {
  hexOf(name: string): string;
};

function loadColorMap(): ColorMap {
  const source = readFileSync(new URL('../miniprogram/utils/colormap.js', import.meta.url), 'utf8');
  const module = { exports: {} as ColorMap };
  vm.runInNewContext(
    source,
    { module, exports: module.exports },
    {
      filename: 'miniprogram/utils/colormap.js',
    },
  );
  return module.exports;
}

const { hexOf } = loadColorMap();

test('黄色与金色使用不同色值，在手机小色卡上可直接区分', () => {
  assert.equal(hexOf('黄色'), '#c19a54');
  assert.equal(hexOf('金色'), '#c9a227');
  assert.notEqual(hexOf('黄色'), hexOf('金色'));

  const yellow = [0xc1, 0x9a, 0x54];
  const gold = [0xc9, 0xa2, 0x27];
  const rgbDistance = Math.hypot(...yellow.map((value, index) => value - gold[index]));
  assert.ok(rgbDistance >= 40, `黄色与金色的 RGB 距离不足：${rgbDistance}`);
});

test('含金字的其他颜色不会误判为金色', () => {
  assert.equal(hexOf('金属灰'), '#8a8272');
  assert.equal(hexOf('姜黄'), '#8a6a3b');
  assert.equal(hexOf('香槟色'), '#efe9d9');
});
