/**
 * 小程序 Logo 来源回归测试。
 *
 * 线上 askqiankun.com 使用内联 SVG，避免后续再次误把旧 PWA 星盘图标当作现用 Logo。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const logoSvg = readFileSync(
  new URL('../miniprogram/brand/logo-askqiankun-bw.svg', import.meta.url),
  'utf8',
);

function readPngSize(relativePath: string): { width: number; height: number } {
  const png = readFileSync(new URL(relativePath, import.meta.url));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

test('小程序黑白 Logo 锁定 askqiankun.com 当前双环路径', () => {
  assert.match(logoSvg, /viewBox="0 0 64 64"/);
  assert.match(logoSvg, /M48\.07 12\.85 A25 25 0 1 1 29\.82 7\.1/);
  assert.match(logoSvg, /M22\.36 43\.49 A15 15 0 1 1 33\.31 46\.94/);
  assert.match(logoSvg, /<circle cx="32" cy="32" r="5" fill="#33302a"/);
  assert.doesNotMatch(logoSvg, /#e3b872|#d4a94e|#b5432f/i);
});

test('后台头像与小程序运行时 Logo 尺寸正确', () => {
  assert.deepEqual(readPngSize('../miniprogram/brand/logo-askqiankun-bw-512.png'), {
    width: 512,
    height: 512,
  });
  assert.deepEqual(readPngSize('../miniprogram/assets/logo-seal.png'), {
    width: 144,
    height: 144,
  });
});
