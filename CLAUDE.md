# mingyu fork · 仓库速查(AI 必读)

> 上层总指引:`../CLAUDE.md`;详细手册:`docs/fork-guide.md`;口径说明:`docs/paipan-notes.md`;
> 工作方法论(怎么拆/怎么验/怎么排):`docs/working-method.md`。
> 本文件只放"在这个仓库里干活"最常用的东西。

## 一分钟上手

```bash
pnpm install --registry=https://registry.npmmirror.com   # 装依赖(必须走镜像)
pnpm --filter mingyu-core build                          # 构建引擎(改 core 后必跑)
pnpm test                                                # 全量测试(约 60s,期望 0 fail)
node scripts/differential-test.mjs                       # 双引擎差分(期望"✅ 完全一致")
node scripts/build-dashboard.mjs                         # 重打包看板站 bundle
node scripts/daily-outfit.mjs 明天                        # 用户的每日穿搭
node scripts/render-daily-card.mjs 明天 [N天]             # 渲五行开运卡视频(小红书素材)
```

## 目录责任

| 路径 | 是什么 | 修改原则 |
|---|---|---|
| `packages/core/src/bazi/` | 八字引擎全部逻辑 | 逻辑只写这里 |
| `packages/core/src/data/` | 城市经度等数据表 | 数据只加不乱删 |
| `src/utils/bazi/*.ts` | re-export 壳 | 新增 core 文件时同步加一行壳,别写逻辑 |
| `packages/core/src/bazi/index.ts` | 引擎导出清单 | 新增公开 API 记得在此导出 |
| `tests/` | 813+ 测试 | 金标准期望值不许改(见红线) |
| `dashboard/` | 看板站,纯静态 | 页面自包含;改完重跑 build-dashboard |
| `miniprogram/` | 微信小程序 | 页面只依赖 lib/mingyu.js;改 core 后重跑 build-miniprogram-lib |
| `mcp/` | MCP server | 跑法:`pnpm mcp`(stdio) |
| `scripts/natal.json` | 用户生日(gitignored) | **永不提交** |

## 核心 API 30 秒版(完整签名见 docs/fork-guide.md)

```js
import { bazi } from 'mingyu-core';
// 完整盘(约45ms):大运/流年/神煞/强弱/用神全有
const r = bazi.baziCalculator.calculateBazi(person);
// 轻量四柱(<1ms):批量/只要盘面时用这个
const p = bazi.baziCalculator.calculatePillars(person);
// 人生K线 / 合婚 / 穿搭 / 城市 / 岁运组合
bazi.calculateLifeKline(person, { startAge, endAge });
bazi.calculateHehun(personA, personB);
bazi.recommendOutfit({ favorableWuxing, unfavorableWuxing, dayGan, dayZhi, dayMasterGan });
bazi.lookupCity('长春');            // → {lon, lat} | null
bazi.analyzeLiunianInteractions({ pillars, dayMaster, liunianGanZhi, dayunGanZhi });
```

`person` 最小形态 `{year, month, day, timeIndex, gender:'male'|'female'}`;
timeIndex:0=早子,1=丑,2=寅…11=亥,12=晚子。
可选:`useTrueSolarTime+birthHour+birthMinute+birthLongitude`(三件套齐上)、
`utcOffset`(默认8)、`lateZiRule:'same-day'`、`strengthModel:'classic-calibrated'`、
`isLunar+isLeapMonth`、`applyChinaDst:false`。

## 红线(简版;每条的"为什么"和例外条件见 docs/fork-guide.md §7,改动前必读)

1. 金标准测试期望值不许改——它们是与独立引擎+史载命例交叉验证过的**外部事实**;
   挂了=代码改坏了。例外仅限"拿出更权威外部证据",commit 附来源。
2. 校准命例标签不许改——来自任铁樵原文批语(quote 即证据),改标签=篡改基准自我过拟合。
   例外仅限"提取误读"(引原文证明)。
3. 改排盘逻辑 → build → pnpm test → differential-test 三连全绿——差分以独立第二实现
   为 oracle,抓单元测试想不到的回归;怀疑 oracle 需第三源仲裁。
4. 默认行为不变,新能力走可选参数——流派是口径不是对错,且下游可复现性优先。
5. 推 `fork` 远程,别推 origin(无写权限,贡献走 PR);当前工作分支 `p1-improvements`。
6. 同步上游:`git fetch origin && git merge origin/main`(作者活跃,PR #118 已被采纳)。
