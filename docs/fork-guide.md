# Fork 完全手册(给接手的 AI / 开发者)

阅读顺序:`../../CLAUDE.md`(项目总览)→ `../CLAUDE.md`(仓库速查)→ 本文(细节)。
口径类问题(晚子时/生肖/时区/精度)另见 `paipan-notes.md`。

---

## 1. 架构

```
输入 Person ──► resolveChartBase(校验→历法→夏令时→真太阳时→四柱→预警)
                    │
        ┌───────────┴────────────┐
  calculatePillars           calculateCoreBazi(+大运/流年)
   (<1ms,轻量)                    │
                            calculateExtendedBazi(藏干/十神/五行/神煞/强弱/格局/用神)
                                   │
              ┌────────────┬───────┴──────┬─────────────┐
        calculateLifeKline  calculateHehun  recommendOutfit  analyzeLiunianInteractions
```

- 干支/节气/大运全部委托 **tyme4ts**(不要自己写历法公式)。
- `src/utils/bazi/` 与 `src/lib/` 里的同名文件多为 re-export 壳或 App 层复制,
  **判断标准**:文件第一行是 `export * from '../../../packages/core/...'` 的是壳;
  逻辑一律改 `packages/core/`,壳只需在新增文件时补一行。
- 例外:`src/lib/date-validation.ts` 是**真复制**不是壳(历史遗留),改年份边界时两处都要改。

## 2. Person 字段完全说明

| 字段 | 类型/默认 | 说明与坑 |
|---|---|---|
| year/month/day | 必填 | 公历(除非 isLunar)。八字域支持 **1600-2100**;紫微/黄历/占卜仍 1900-2100 |
| timeIndex | 必填 0-12 | **时辰序号**:0早子(00-01) 1丑 2寅 3卯 4辰 5巳 6午 7未 8申 9酉 10戌 11亥 **12晚子(23-24)**。非真太阳时模式下分钟按 0 处理 |
| gender | 必填 | 'male'/'female',只影响大运顺逆,不影响强弱评分 |
| isLunar / isLeapMonth | false | 农历输入;闰月传 isLeapMonth:true |
| useTrueSolarTime | false | 开了就必须给 birthHour+birthMinute+birthLongitude,缺一抛错;校正后**整盘重排**(含跨日),timeIndex 被忽略 |
| birthLongitude | — | 东经为正。与标准经线差 >30° 会出 warning(提示核对时区) |
| utcOffset | 8 | 时区小时(支持 5.5 这类半时区);标准经线 = utcOffset×15;**非 8 时自动跳过中国夏令时校正** |
| applyChinaDst | true | 1986-1991 夏令时自动回拨 60 分钟(仅真太阳时模式);所记时间已是标准时则设 false |
| lateZiRule | 'next-day' | 晚子时日柱归属流派;'same-day'=日柱算当天(已被 taibu 独立实现交叉验证) |
| strengthModel | 'legacy' | 'classic-calibrated'=古籍校准阈值(2.5/0/-1.5/-2.5)。**两模型评分相同,只有分档不同**。看板/小程序默认用 calibrated,引擎默认 legacy(兼容上游) |
| shenShaVariants | — | 神煞流派微调,一般别动 |

## 3. 各模块 API 与返回结构

### calculateBazi(person) → BaziChartResult(约 45ms)
关键字段:`pillars{year,month,day,hour}.{gan,zhi,ganZhi}`、`dayMaster{gan,element,yinYang}`、
`wuxingStrength{scores,percentages,missing}`、`luckInfo.cycles[]`(大运,含 years 流年)、
`liunian[]`(平铺流年)、`analysis.dayMasterStrength{score,status,details}`、
`analysis.mingGe{pattern}`、`analysis.usefulGod`(见下)、`warnings[]`、`timing`(真太阳时信息)。

`usefulGod` 要点:`favorableWuxing[]`(有序,第一个=主用神)、`unfavorableWuxing[]`、
`primaryReason`(如"调候")、`strategyTrace[]`(可审计推理链)、`matchedRules[]`(命中的古籍规则)、
`schools`(用神四派并行结论,见下)。

`schools`(参考 DeepOracle 四派决策框架,**只并列透出、不改最终裁决**):
- `fuyi{favorableWuxing,primary}` 扶抑派(身强泄/身弱补)
- `tiaohou{applied,favorableWuxing,primary}` 调候派(月令寒暖,冬木必火)
- `bingyao{applied,primary,hint}` 病药派(命局矛盾为病、用神为药)
- `zhuanwang{dominantWuxing,dominantPct,controllerPct,drainerPct,qualifies,nearMiss,favorableWuxing,unfavorableWuxing,note}`
  专旺派。**qualifies** = 旺神≥50% 且克/泄反力均<10% 且旺神即日主;**nearMiss** = 旺神≥42% 但未成格
  (标记"扶抑vs专旺分歧高发盘")。
- `consensus` 各适用派首选一致时的共识五行(高信心),否则 null;`diverged` 扶抑与调候首选是否分歧(旧字段)。
- 场景分发建议:日常穿搭以调候为主,重大决策看扶抑+病药,极端命局看专旺。

### calculatePillars(person) → BaziPillarsLite(<1ms)
只有 `solarDate/lunarDate/pillars/dayMaster/timeInfo/timing/warnings`。
批量场景(差分测试/反查/流日)必须用它,不要循环调 calculateBazi。

### calculateLifeKline(person, {startAge=1, endAge=80})
返回 `{natal, years[]}`;每年 `{year,age,liunianGanZhi,tenGod,dayunGanZhi,score,
open,high,low,close,monthScores[12],events[],factors[]}`。
评分模型:50 + 流年干支×喜忌(权重 [12,7,4,2] 递减,支×1.2)+ 大运×(0.5/0.6)
+ 岁运组合(major-12/caution-6)+ 流年支合日支(+4/+3),clamp 2..98。
OHLC:open=前年 close(连续性),high/low=含 open 的流月极值。
**改权重前先跑 tests/life-kline-hehun.test.ts 的方向性断言。**

### calculateHehun(personA, personB)
返回 `{total(0-100), grade(上上/上/中/中下/下), rules[], a, b, disclaimer}`。
每条 rule `{id,name,score,detail,source:'子平'|'现代'|'民俗'}`。规则与权重:
日干五合+10/异性克+5/同性克-6/相生+6;夫妻宫(日支)六合+12/三合+8/冲-14/刑-9/害-7;
年支六合+6/三合+5/冲-7;用神互补 ±9/-8;缺补+4;纳音生+5/克-4;阴阳+3。
性质:对称(A,B 与 B,A 同分)。测试有对称性断言。

### recommendOutfit(input) / WUXING_IMAGERY
input:`{favorableWuxing[], unfavorableWuxing[], dayGan?, dayZhi?, dayMasterGan?}`。
给了当日干支会输出十神提示;地支为忌且所生五行为喜时输出**通关**建议。
取象表 WUXING_IMAGERY 是传统主流口径(木绿火红土黄金白水黑),改前先确认用户要求。

### generateXiaoliuren(params)
`{method:'time'|'number'|'random', number?}`。返回 `sequence:{start,process,result}`
——**第三宫是 `result` 不是 `end`**(踩过的坑)。每宫含
name/element/meaning/advice/fortune/timing/direction/shenSha 等。

### analyzeLiunianInteractions({pillars, dayMaster, liunianGanZhi, dayunGanZhi?})
七条经典组合:岁运并临/天克地冲/伤官见官/比劫夺财/枭神夺食/羊刃逢冲(仅阳干)/冲提纲。
severity 只表传统重视程度,不是吉凶断言。

### lookupCity(name) / CHINA_CITIES
117 城,去"市/省"后缀+前缀模糊匹配,查不到返回 null(调用方必须判空)。

## 4. 标准工作流(带期望输出)

### 改了引擎代码
```bash
pnpm --filter mingyu-core build      # 期望:无 error,"Fixed N dist files"
pnpm test                            # 期望:pass 813+,fail 0
node scripts/differential-test.mjs   # 期望:"✅ 双引擎四柱完全一致"(约 10s)
```
任何一步不符 → 你改坏了,回滚重想;**不要改测试期望值来过关**。

### 改任何 UI(看板/小程序/视频卡)
**先读 `docs/design.md`(知几·宣纸设计规范)**——色值/字体/间距/组件/动效全部强制;
改色只许改其 §8 映射表列出的三处源头,禁止页面内联新 hex。

### 改了看板(dashboard/)
```bash
node scripts/build-dashboard.mjs     # 期望:mingyu.js ~700kb, Done
```
然后浏览器验证(纯 file:// 可开;要 http 就 `npx serve -l 4173 dashboard`)。
页面结构:每页自包含(HTML+内联 JS),共享 assets/{style.css,common.js,mingyu.js}。
主题:水墨(默认)/宣纸,CSS 变量在 `:root` 与 `html[data-theme="paper"]`;
SVG/canvas 里取色一律用 `cssVar('--xxx')`,不要写死 hex(涨跌红绿除外)。

### 改了小程序(miniprogram/)
```bash
node scripts/build-miniprogram-lib.mjs   # 重打 lib/mingyu.js
# Node 里验证 CJS 必须先复制成 .cjs(仓库根是 type:module):
cp miniprogram/lib/mingyu.js $TEMP/v.cjs && node -e "console.log(Object.keys(require(process.env.TEMP+'/v.cjs')))"
```
微信开发者工具导入 miniprogram/ 目录预览;页面只许依赖 lib/mingyu.js + app.wxss。

### 开运卡视频(小红书内容管线)
```bash
node scripts/render-daily-card.mjs 明天 7   # 引擎算流日 → hyperframes 渲 7 天带 alpha 的 MOV
```
组合在 `D:/Claude/Tools/hyperframes-studio/wuxing-daily/`(工具目录,不入本仓库);
渲染环境、浏览器路径、抽帧验收陷阱(勿用 -ss,按帧号 select)见该目录上级 README.md。
**定位注意**:hyperframes 是"HTML+GSAP → 视频"的内容管线,不是运行时库——
小程序内的交互动效用 WXSS/canvas(已内置动效库),两者互补不互替。

### 强弱校准相关
```bash
node scripts/calibrate-strength.mjs      # 报告两模型吻合度 + 阈值网格
```
扩充命例:古籍 txt 放 `D:\AI work\Projects\Qiankun\古籍\` →
`node scripts/extract-classic-cases.mjs <txt> <书名> > out.jsonl` →
**人工逐条复核**(警惕:反问句"岂不"、驳论"俗谓…不知"、说别的盘"前造")→
`node scripts/build-classic-fixture.mjs out.jsonl`(四柱反查日期,书中干支自相矛盾的会正确落入 unmatched)。

## 5. 完整坑表(症状 → 原因 → 解法)

| 症状 | 原因 | 解法 |
|---|---|---|
| `require` 打包产物得到 `{}` 空对象 | 仓库根 type:module,Node 把 CJS 文件当 ESM | 复制成 `.cjs` 再 require;小程序内不受影响 |
| `pnpm install` 挂起/ETIMEDOUT | 直连 npm 网络差 | 加 `--registry=https://registry.npmmirror.com` |
| 测试报 `mingyu-core/dist/... not found` | 改了 core 没重新 build,壳测试吃 dist | `pnpm --filter mingyu-core build` |
| 排盘结果时辰不对 | 把小时当 timeIndex 传了 | 查上面的 timeIndex 映射表 |
| 真太阳时抛"缺少精准时间或经度" | 三件套没给齐 | useTrueSolarTime+birthHour+birthMinute+birthLongitude |
| 海外出生排出来差几个时辰 | 没传 utcOffset(默认东八区) | `utcOffset: 当地时区`(如美东冬令时 -5) |
| 1899 及以前报"年份需在 1600-2100" | 正常,八字域下限 1600 | 别放宽,1600 前有儒略历问题 |
| 紫微/黄历 1900 前报错 | 其他域仍 1900-2100(iztro 等依赖限制) | 属预期,别改 |
| 23:00-24:00 出生日柱与别家不同 | 晚子时流派差异 | 默认子初换日;要传统派传 `lateZiRule:'same-day'` |
| 强弱判定和"感觉"不符 | legacy 阈值偏严(评分系统性偏弱约4分) | 用 `strengthModel:'classic-calibrated'`;别直接改权重 |
| 小六壬渲染 undefined | 用了 `sequence.end` | 是 `sequence.result` |
| 看板改完没生效 | 没重打 bundle / 浏览器缓存 | build-dashboard + 强刷 |
| K线图某主题下看不清 | SVG 里写死了颜色 | 用 `cssVar('--line'/'--muted'/'--gold')` |
| 城市查不到经度 | lookupCity 返回 null 没判 | 判空并回退到手输经度 |
| CI lint 挂 prettier 引号错 | 用 shell printf/echo 直接生成 .ts 文件,双引号违反仓库规则 | 生成代码文件后跑 `npx eslint src --fix`;push 前 `pnpm run lint` 预检(CI 有 lint/type-check/build/test 四个 job,推前最好全预检) |
| git push 报权限/refspec | 推错远程 | 用户的远程叫 `fork`,上游是 `origin`(只读) |
| gh/curl GitHub 偶发 EOF | 网络抖动 | 重试 2-3 次,或走 `https://r.jina.ai/<url>` 读页面 |

## 6. 设计决策记录(ADR)——为什么是现在这样

> 给强模型/资深开发者:每条含决策、原因、以及**什么条件下可以推翻**。
> 觉得某条不合理时,先满足它的翻案条件,再动手。

### ADR-1 历法计算全部委托 tyme4ts,不自研公式
**原因**:历法 = 天文算法 + 历史政令(历改/夏令时),自研必然在边角出错;tyme4ts 与
lunar-javascript 同出 6tail 一系但实现独立,恰好构成我们差分测试的双 oracle。
本 fork 的价值在**解读层**(用神/校准/K线/合婚),不在重造历法。
**翻案条件**:tyme4ts 停止维护且出现已证实的历法 bug 上游不修——届时换库,不是自写。

### ADR-2 strengthModel 默认 legacy,calibrated 是 opt-in
**原因**:(a) 与上游行为一致,merge 与提 PR 都无摩擦;(b) calibrated 的证据(古籍 61 例
84% vs legacy 74%)方向明确但**样本量还不够定论**;(c) 默认保守、新证据 opt-in,
是校准工作的正确姿势。
**翻案条件**:古籍命例扩到 200+ 且 calibrated 优势保持,或上游采纳 calibrated——
届时翻转默认,并在 CHANGELOG 声明破坏性变更。

### ADR-3 晚子时默认 next-day(子初换日)
**原因**:与 tyme4ts 默认及现代排盘软件主流一致,"最少惊讶";same-day 是传统子平
一派,已通过 lateZiRule 提供且经 taibu 交叉验证。这是**流派口径,没有对错**,
所以永远不该有"正确的默认",只有"稳定的默认"。
**翻案条件**:无。要变只能等大版本并显式公告。

### ADR-4 强弱评分权重不许"顺手调"
**原因**:我们已经**量化证明**评分系统性偏弱约 4 分(两套独立标签一致指向),
说明权重确实需要重校——但 61+15 例不足以拟合十几个权重参数,现在调就是过拟合;
更危险的是"调到用户自己的盘好看"这种动机性推理。
**正确路径**:先扩命例(工具链齐备:extract → 人工复核 → build-fixture)→
用 calibrate-strength.mjs 报告改动前后吻合度 → 权重改动的 commit 必须附两份报告对比。
**翻案条件**:上面的路径本身就是翻案通道,照走即可。

### ADR-5 src/utils 与 src/lib 保持"壳"形态
**原因**:上游的架构是逻辑在 packages/core、App 层相对路径引用;我们把逻辑
全写在 core、壳只 re-export,是为了**最小化与上游的 merge 冲突面**(上游活跃,
我们每合并一次上游,壳文件几乎不会冲突)。
**注意**:src/lib/date-validation.ts 是历史遗留的真复制(上游如此),改边界要改两处。
**翻案条件**:上游自己重构掉 App 层复制——跟随即可。

### ADR-6 八字域年份下限 1600,其他域维持 1900
**原因**:放宽是为了古籍命例反查(明清人物);选 1600 而非更早,是避开 1582 年
儒略/格里历切换的日期语义歧义,并留缓冲。紫微/黄历没放宽,因为 iztro 等依赖
未对 1900 前做过验证——**没验证过的能力不该开放**。1900 前的八字排盘经乾隆
金标准抽验,但未逐日核对,fork-guide 与代码注释都保留了这个诚实的限定。
**翻案条件**:对目标区间做过系统对拍(方法:differential-test 改年份范围)。

### ADR-7 K线红涨绿跌(中式),不用国际口径
**原因**:目标用户是中文命理用户,A 股惯例红涨绿跌;Binance 等国际风格的绿涨
红跌会让目标用户误读高低年。
**翻案条件**:做国际化时加主题级开关,而不是改默认。

### ADR-8 看板是零依赖纯静态,不用前端框架
**原因**:(a) 用户核心诉求是"双击就能用",file:// 协议下框架路由/构建产物都是负担;
(b) 命理数据敏感,纯本地运行、零网络请求是隐私承诺(页面里没有任何 fetch);
(c) 每页自包含 = 未来拆单功能小程序/独立站时直接搬走。
**代价(已接受)**:每页有少量重复的表单代码。
**翻案条件**:页面数超过 ~15 或出现复杂共享状态——届时再上构建框架,
且必须保留 file:// 可用的产物形态。

### ADR-9 合婚/K线的分数是"规则量化",不是预测
**原因**:每条规则都能溯源到传统文献口径(子平/民俗/现代三层),权重是**表达
传统上的相对重视程度**,不是统计意义上的效应量。所以所有输出都强制带
"仅供文化研究与娱乐"声明——这既是伦理要求,也是产品红线,**任何界面改版
不许删掉这句**。
**翻案条件**:无。

### ADR-10 用神四派并列输出,而非"引擎给一个标准答案"
**原因**:用神取用是命理里最主观的一步,四派(扶抑/调候/病药/专旺)对同一盘常给不同
甚至相反的结论——木旺近专旺的盘常出现"引擎喜火 vs 民间忌火"的正面冲突,根源是扶抑派与
专旺派对"极旺之木该泄还是该顺"的前提分歧。若引擎只输出单一结论,等于替用户暗中选了
一个流派、抹掉了这个真实存在的分歧。所以 `schools` 把四派原始判读全透出、`consensus`
标共识、`zhuanwang.nearMiss` 标"分歧高发盘",**最终裁决仍不变(调候优先)**——
呈现分歧 ≠ 改变默认。这与 ADR-3/ADR-4"流派是口径不是对错"一脉相承。
**翻案条件**:无(这是设计原则,不是可调参数)。若未来要**改最终裁决顺序**(如让扶抑
优先于调候),那是另一回事,须走 ADR-4 同款证据通道(命例回归),且默认不能悄悄翻。

## 7. 数据与依据(改动前先知道来源)

- 排盘正确性:差分测试(taibu-core/lunar-javascript 为独立 oracle)+ 属性测试
  (日柱逐日+1、六十甲子、五鼠遁、立春换年)+ 金标准(乾隆帝 1711-09-25 史载八字等)。
- 用神:120 文件 411 条调候规则(《穷通宝鉴》口径),strategyTrace 可审计。
- 强弱校准:《滴天髓阐微》61 例任铁樵批语命例(殆知阁公版全文,每例带原文 quote 与
  反查日期,见 fixtures)。吻合度:legacy 67% / calibrated 82%。
- 合婚:子平日柱说(《三命通会》一脉)+ 现代用神互补 + 唐·吕才纳音(民俗层)。
- 所有输出必须保留"仅供文化研究与娱乐"性质的声明,这是产品红线也是伦理要求。
