/** 打包小程序引擎库(CJS):node scripts/build-miniprogram-lib.mjs */
import { build } from 'esbuild';

await build({
  entryPoints: ['miniprogram/src/lib-entry.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2020',
  minify: true,
  outfile: 'miniprogram/lib/mingyu.js',
  logLevel: 'info',
});
console.log('小程序引擎库完成 → miniprogram/lib/mingyu.js');
