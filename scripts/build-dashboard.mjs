/** 打包看板站引擎 bundle:node scripts/build-dashboard.mjs */
import { build } from 'esbuild';

await build({
  entryPoints: ['dashboard/src/api.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  outfile: 'dashboard/assets/mingyu.js',
  logLevel: 'info',
});
console.log('dashboard bundle 完成 → dashboard/assets/mingyu.js');
