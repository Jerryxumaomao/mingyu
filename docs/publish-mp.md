# 小程序上传与发布手册

> 依据:官方 [miniprogram-ci 文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)
> 与 [开发者工具 Skills 文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/Skills.html)(2026-07 阅读)。
> 审核文案见 `miniprogram/brand/store-copy.md`(简介 / 审核备注 / 类目建议 / 一致性提醒)。

## 总览:三条路,一个共同前置

**共同前置:真实 AppID。**`miniprogram/project.config.json` 的 appid 现在还是
`touristappid`,三条路全都走不通。注册(个人主体即可)→ 拿 AppID → 替换该字段。

| 路径 | 能做什么 | 适合 |
|---|---|---|
| ① 开发者工具 GUI | 全流程:编译/预览/上传 | 首次上架,肉眼确认 |
| ② miniprogram-ci(已接入) | 命令行 上传/预览 | 日常迭代,免开 GUI |
| ③ 开发者工具 Skills(未装) | AI 直接驱动工具:编译/模拟器/截图/传体验版 | AI 自动化闭环 |

**三条路都只到"上传"为止。提审和发布必须在 mp.weixin.qq.com 后台手动点**
(个人主体没有提审 API;第三方平台代提审不适用于我们)。

## 路径②:miniprogram-ci(本仓库已就绪)

一次性准备(都在 mp.weixin.qq.com):
1. 管理 → 开发管理 → 开发设置 → **小程序代码上传** → 生成密钥,
   下载 `private.wxXXXX.key` 放进 `scripts/`(已 gitignore,**永不入库**,泄露=任何人可传代码);
2. 同页建议配置 IP 白名单(家庭宽带 IP 会变,变了去后台更新,或关白名单降一档安全);

日常使用:
```bash
node scripts/build-miniprogram-lib.mjs        # 先刷新引擎 lib(改过 core 才需要)
node scripts/upload-miniprogram.mjs preview   # 体验二维码 → output/mp-preview.png
node scripts/upload-miniprogram.mjs upload 1.0.0 "首个提审版本"
```
脚本守卫:appid 未替换 / 密钥缺失都会报中文指引;`robot:1`(上传机器人号,
同号新传覆盖旧传,想并存多版本换 2~30)。

## 路径③:开发者工具 Skills(装好后 AI 可全自动)

- 需要 **Nightly 版**开发者工具(≥2.02.2607032),下载装好并**微信扫码登录**
  (这两步只能人来);
- 终端跑 `wechatide`,把输出的 Skill 路径交给 AI(或菜单栏"导出开发者工具 Skill");
- 之后 AI 可调 `wechatide -c <client> -t <tool>`:开项目窗口、编译、打开指定页、
  模拟器点击/输入/截图、读 Console/Network 日志、真机预览二维码、**上传体验版**;
- 对本项目的价值:小程序 UI 改动可以像看板一样"改完→截图目验→迭代",
  不再依赖用户手工在工具里点。

## 后台手动部分(上传之后)

1. 版本管理 → **开发版本**出现刚上传的版本;
2. (可选)"选为体验版" → 团队扫码试用;
3. **提交审核**:填服务类目(避开占卜/星座类,见 store-copy.md)、页面路径、
   审核备注(用 store-copy.md 里 188 字首选版);
4. 首次提审注意**一致性**:审核员会打开小程序对照备注,页面可见文案需与
   "穿搭/疗愈/历法"口径一致(提审前软化"八字排盘"等字样;不做审核开关,违规);
5. 审核通过 → 版本管理点**发布**(支持全量或分阶段);被拒 → 看拒绝理由,
   优先改简介/备注/页面措辞再提,不要申诉硬刚。
