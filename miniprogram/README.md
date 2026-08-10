# 乾坤穿搭 · 微信小程序

基于 mingyu-core 引擎的传统五行色彩穿搭工具。当前提审版本已实现五个页面:
今日、穿搭、生肖、一周色卡、衣橱。为适配微信审核，前台已去个人命理化；
底层排盘、合婚、小六壬、人生 K 线等能力仍保留在 `lib/mingyu.js`，供看板和后续功能复用。

## 使用

1. 引擎库已生成于 `lib/mingyu.js`;改动核心代码后重新打包:
   ```bash
   node scripts/build-miniprogram-lib.mjs   # 在仓库根目录执行
   ```
2. 微信开发者工具 → 导入项目 → 选择本 `miniprogram/` 目录；`project.config.json` 已配置项目 AppID。
3. 上架前注意:命理类内容需遵守平台规范,保留"仅供文化研究与娱乐"声明。

## 页面结构

- `pages/index`:今日宜忌与每日色彩
- `pages/outfit`:穿搭推荐
- `pages/zodiac`:生肖内容
- `pages/week-colors`:一周色卡
- `pages/wardrobe`:衣橱搭配

冷启动直接进入 `pages/index`，项目不包含自定义开屏遮罩。每日颜色统一由
`utils/today-almanac.js` 按“日支五行 → 所生五行为主色、同气为辅色”计算；
`tests/miniprogram-daily-color.test.ts` 固定校验 2026-08-02 戊申日应推荐黑蓝水系。

首页 Logo 使用 `assets/logo-seal.png`；造型来自 `askqiankun.com` 当前导航栏的
双断环 `.qk-logo`。可编辑黑白 SVG 母版位于 `brand/logo-askqiankun-bw.svg`，
512px 小程序后台头像位于 `brand/logo-askqiankun-bw-512.png`。

## 香水文字识别与隐私

衣橱搜索始终先查 `data/perfumes.js` 的离线香水库，本地命中不联网。仅当本地
查不到且用户主动点击识别时，`utils/perfume-ai.js` 才会把当次香水名称发送到
`https://askqiankun.com/api/miniprogram/perfumes/resolve`。服务端缓存命中不调用模型；
首次未命中才检索少量公开资料并用低输出预算模型提取香调。识别结果必须由用户
确认后才按既有 `{ n, f, wx }` 结构保存到本机，手动选择香调的入口始终保留。

小程序端不包含搜索或模型 API key，也不会在该请求中发送既有衣橱、账号、生日、
位置或联系方式。上线前必须同步更新微信公众平台《小程序用户隐私保护指引》，并
把 `https://askqiankun.com` 配置为 `request` 合法域名。

## 拆分单功能小程序

每个页面自包含(只依赖 `lib/mingyu.js` + `app.wxss` 样式),把对应 `pages/xxx` 目录
和 lib 复制到新项目、在 `app.json` 里只留该页即可。
