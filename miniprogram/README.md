# 命语 · 微信小程序

基于 mingyu-core 引擎的命理小程序骨架。已实现:首页、八字排盘、人生K线(canvas 蜡烛图);
合婚/小六壬/五行穿搭的引擎函数已打进 `lib/mingyu.js`,加页面即可。

## 使用

1. 引擎库已生成于 `lib/mingyu.js`;改动核心代码后重新打包:
   ```bash
   node scripts/build-miniprogram-lib.mjs   # 在仓库根目录执行
   ```
2. 微信开发者工具 → 导入项目 → 选择本 `miniprogram/` 目录,AppID 用测试号或替换 `project.config.json` 中的 `touristappid`。
3. 上架前注意:命理类内容需遵守平台规范,保留"仅供文化研究与娱乐"声明。

## 拆分单功能小程序

每个页面自包含(只依赖 `lib/mingyu.js` + `app.wxss` 样式),把对应 `pages/xxx` 目录
和 lib 复制到新项目、在 `app.json` 里只留该页即可。
