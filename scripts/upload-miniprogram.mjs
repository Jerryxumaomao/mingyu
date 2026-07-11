/**
 * 小程序 CI 上传/预览脚本(miniprogram-ci,免开开发者工具)
 *
 * 用法:
 *   node scripts/upload-miniprogram.mjs preview                    # 生成体验二维码 output/mp-preview.png
 *   node scripts/upload-miniprogram.mjs upload 1.0.0 "首个提审版本"  # 上传到后台"开发版本"
 *
 * 前置(一次性,都在 mp.weixin.qq.com 后台):
 *   1. project.config.json 的 appid 换成真实 AppID(现在还是 touristappid)
 *   2. 管理→开发管理→开发设置→小程序代码上传:生成密钥,下载 private.wxXXXX.key
 *      放进 scripts/ 目录(已 gitignore,永不入库);建议同时配 IP 白名单
 *   3. 上传前记得先 node scripts/build-miniprogram-lib.mjs 刷新引擎 lib
 *
 * 注意:CI 只能"上传/预览"。提审、发布没有个人主体可用的 API,
 *      必须在后台 版本管理 页手动操作(流程见本脚本底部注释)。
 */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ci = require('miniprogram-ci');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mpRoot = path.join(root, 'miniprogram');
const conf = JSON.parse(readFileSync(path.join(mpRoot, 'project.config.json'), 'utf8'));

if (!conf.appid || conf.appid === 'touristappid') {
  console.error('✖ project.config.json 的 appid 还是 touristappid,先在微信公众平台注册拿到真实 AppID 再来。');
  process.exit(1);
}

// 密钥:优先环境变量,否则在 scripts/ 里找 private.*.key
const keyPath = process.env.MP_PRIVATE_KEY_PATH
  || readdirSync(path.join(root, 'scripts')).filter(f => /^private\..*\.key$/.test(f))
    .map(f => path.join(root, 'scripts', f))[0];
if (!keyPath) {
  console.error('✖ 找不到上传密钥。去后台"开发设置→小程序代码上传"生成并下载 private.wxXXXX.key,放进 scripts/ 目录。');
  process.exit(1);
}

const project = new ci.Project({
  appid: conf.appid,
  type: 'miniProgram',
  projectPath: mpRoot,
  privateKeyPath: keyPath,
  ignores: ['node_modules/**/*', 'brand/**/*'], // brand 是 icon 源材料,不属于运行代码
});
const setting = { es6: true, minified: true };

const [mode, version, ...descParts] = process.argv.slice(2);

if (mode === 'preview') {
  const out = path.join(root, 'output');
  mkdirSync(out, { recursive: true });
  const dest = path.join(out, 'mp-preview.png');
  await ci.preview({ project, desc: '本地预览', setting, qrcodeFormat: 'image', qrcodeOutputDest: dest });
  console.log(`✅ 预览二维码已生成:${dest}(微信扫码打开)`);
} else if (mode === 'upload') {
  if (!version) { console.error('✖ 用法:node scripts/upload-miniprogram.mjs upload <版本号> <版本描述>'); process.exit(1); }
  const desc = descParts.join(' ') || `${version} 提交`;
  await ci.upload({ project, version, desc, setting, robot: 1, onProgressUpdate: m => console.log(' ', typeof m === 'string' ? m : m._msg || '') });
  console.log(`✅ 已上传 v${version}(机器人1)。后续在后台手动走:`);
  console.log('   版本管理 → 开发版本(找到这条)→ [选为体验版](可选)→ 提交审核');
  console.log('   → 填类目/页面/备注(备注文案在 miniprogram/brand/store-copy.md)→ 等审核 → 通过后点"发布"');
} else {
  console.error('用法: node scripts/upload-miniprogram.mjs preview | upload <版本号> <描述>');
  process.exit(1);
}
