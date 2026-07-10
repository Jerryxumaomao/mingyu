/**
 * @file 八字合婚
 * @description 多层规则评分,每条标注出处层级:
 *   [子平] 日柱为婚配主轴:日干五合/相生克,日支(夫妻宫)刑冲合害 —— 《三命通会》男女合婚论一脉
 *   [现代] 用神互补:一方喜用神在对方命局旺盛为上 —— 民国以来子平主流(徐乐吾一脉)
 *   [民俗] 属相(年支)合冲、吕才纳音年命合婚(唐《合婚书》) —— 权重低于日柱
 * 输出总分(0-100)、等级与逐条明细。仅供文化研究与娱乐,不构成婚姻建议。
 */
import { baziCalculator } from './baziCalculator';
import { getWuxing, getGanYinYang } from './baziUtils';
import type { Person } from './baziTypes';

export interface HehunRule {
  id: string;
  name: string;
  score: number;
  detail: string;
  source: '子平' | '现代' | '民俗';
}

export interface HehunResult {
  total: number;
  grade: '上上' | '上' | '中' | '中下' | '下';
  rules: HehunRule[];
  a: { pillars: string; dayMaster: string; favorable: string[] };
  b: { pillars: string; dayMaster: string; favorable: string[] };
  disclaimer: string;
}

const GAN_WUHE: Record<string, string> = {
  甲: '己',
  己: '甲',
  乙: '庚',
  庚: '乙',
  丙: '辛',
  辛: '丙',
  丁: '壬',
  壬: '丁',
  戊: '癸',
  癸: '戊',
};
const GAN_KE: Record<string, string> = {
  甲: '戊',
  乙: '己',
  丙: '庚',
  丁: '辛',
  戊: '壬',
  己: '癸',
  庚: '甲',
  辛: '乙',
  壬: '丙',
  癸: '丁',
};
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

const LIU_HE: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
};
const LIU_CHONG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
};
const LIU_HAI: Record<string, string> = {
  子: '未',
  未: '子',
  丑: '午',
  午: '丑',
  寅: '巳',
  巳: '寅',
  卯: '辰',
  辰: '卯',
  申: '亥',
  亥: '申',
  酉: '戌',
  戌: '酉',
};
const SAN_HE = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
];
const XING_GROUPS = [
  ['寅', '巳', '申'],
  ['丑', '未', '戌'],
];
const ZI_XING = new Set(['辰', '午', '酉', '亥']);

const inTrine = (a: string, b: string) =>
  a !== b && SAN_HE.some((g) => g.includes(a) && g.includes(b));
const isXing = (a: string, b: string) =>
  (a === '子' && b === '卯') ||
  (a === '卯' && b === '子') ||
  (a === b && ZI_XING.has(a)) ||
  (a !== b && XING_GROUPS.some((g) => g.includes(a) && g.includes(b)));

export function calculateHehun(personA: Person, personB: Person): HehunResult {
  const A = baziCalculator.calculateBazi(personA);
  const B = baziCalculator.calculateBazi(personB);
  const rules: HehunRule[] = [];
  const add = (r: HehunRule) => rules.push(r);

  const aDG = A.dayMaster.gan;
  const bDG = B.dayMaster.gan;
  const aDZ = A.pillars.day.zhi;
  const bDZ = B.pillars.day.zhi;

  // ── 1. 日干关系 [子平] ──
  if (GAN_WUHE[aDG] === bDG) {
    add({
      id: 'rigan-wuhe',
      name: '日干五合',
      score: 10,
      detail: `${aDG}${bDG}天干五合,日主相合主情投意合`,
      source: '子平',
    });
  } else {
    const aEl = getWuxing(aDG);
    const bEl = getWuxing(bDG);
    if (GAN_KE[aDG] === bDG || GAN_KE[bDG] === aDG) {
      const diffYinYang = getGanYinYang(aDG) !== getGanYinYang(bDG);
      if (diffYinYang) {
        add({
          id: 'rigan-caiguan',
          name: '日干异性相克(财官相配)',
          score: 5,
          detail: '阴阳相克成财官之配,传统视为有情之克',
          source: '子平',
        });
      } else {
        add({
          id: 'rigan-tongke',
          name: '日干同性相克',
          score: -6,
          detail: '同性相克为无情之克,主性格相争',
          source: '子平',
        });
      }
    } else if (SHENG[aEl] === bEl || SHENG[bEl] === aEl) {
      add({
        id: 'rigan-xiangsheng',
        name: '日干相生',
        score: 6,
        detail: `${aEl}${bEl}相生,互有滋助`,
        source: '子平',
      });
    } else if (aEl === bEl) {
      add({
        id: 'rigan-bijian',
        name: '日干比和',
        score: 1,
        detail: '同气相求,平淡而稳',
        source: '子平',
      });
    }
  }

  // ── 2. 日支夫妻宫 [子平] ──
  if (LIU_HE[aDZ] === bDZ)
    add({
      id: 'rizhi-liuhe',
      name: '夫妻宫六合',
      score: 12,
      detail: `日支${aDZ}${bDZ}六合,夫妻宫相合为合婚上格`,
      source: '子平',
    });
  else if (inTrine(aDZ, bDZ))
    add({
      id: 'rizhi-sanhe',
      name: '夫妻宫三合',
      score: 8,
      detail: `日支${aDZ}${bDZ}三合`,
      source: '子平',
    });
  else if (LIU_CHONG[aDZ] === bDZ)
    add({
      id: 'rizhi-chong',
      name: '夫妻宫相冲',
      score: -14,
      detail: `日支${aDZ}${bDZ}六冲,传统最忌`,
      source: '子平',
    });
  else if (isXing(aDZ, bDZ))
    add({
      id: 'rizhi-xing',
      name: '夫妻宫相刑',
      score: -9,
      detail: `日支${aDZ}${bDZ}相刑`,
      source: '子平',
    });
  else if (LIU_HAI[aDZ] === bDZ)
    add({
      id: 'rizhi-hai',
      name: '夫妻宫相害',
      score: -7,
      detail: `日支${aDZ}${bDZ}相害`,
      source: '子平',
    });
  else if (aDZ === bDZ)
    add({
      id: 'rizhi-tong',
      name: '夫妻宫同气',
      score: 3,
      detail: '日支相同,同气相守',
      source: '子平',
    });

  // ── 3. 年支属相 [民俗] ──
  const aYZ = A.pillars.year.zhi;
  const bYZ = B.pillars.year.zhi;
  if (LIU_HE[aYZ] === bYZ)
    add({
      id: 'nianzhi-liuhe',
      name: '属相六合',
      score: 6,
      detail: `年支${aYZ}${bYZ}六合`,
      source: '民俗',
    });
  else if (inTrine(aYZ, bYZ))
    add({
      id: 'nianzhi-sanhe',
      name: '属相三合',
      score: 5,
      detail: `年支${aYZ}${bYZ}三合`,
      source: '民俗',
    });
  else if (LIU_CHONG[aYZ] === bYZ)
    add({
      id: 'nianzhi-chong',
      name: '属相六冲',
      score: -7,
      detail: `年支${aYZ}${bYZ}相冲(民俗层,权重低于日柱)`,
      source: '民俗',
    });
  else if (isXing(aYZ, bYZ))
    add({
      id: 'nianzhi-xing',
      name: '属相相刑',
      score: -4,
      detail: `年支${aYZ}${bYZ}相刑`,
      source: '民俗',
    });
  else if (LIU_HAI[aYZ] === bYZ)
    add({
      id: 'nianzhi-hai',
      name: '属相相害',
      score: -4,
      detail: `年支${aYZ}${bYZ}相害`,
      source: '民俗',
    });

  // ── 4. 用神互补 [现代] ──
  const favA =
    (A.analysis.usefulGod as unknown as { favorableWuxing?: string[] }).favorableWuxing ?? [];
  const favB =
    (B.analysis.usefulGod as unknown as { favorableWuxing?: string[] }).favorableWuxing ?? [];
  const unfA =
    (A.analysis.usefulGod as unknown as { unfavorableWuxing?: string[] }).unfavorableWuxing ?? [];
  const unfB =
    (B.analysis.usefulGod as unknown as { unfavorableWuxing?: string[] }).unfavorableWuxing ?? [];
  const pctA = A.wuxingStrength.percentages as Record<string, number>;
  const pctB = B.wuxingStrength.percentages as Record<string, number>;
  if (favA[0] && (pctB[favA[0]] ?? 0) >= 25) {
    add({
      id: 'yongshen-a',
      name: '对方旺你所喜',
      score: 9,
      detail: `甲方主用神${favA[0]}在乙方局中占 ${pctB[favA[0]]}%,得所需之气`,
      source: '现代',
    });
  }
  if (favB[0] && (pctA[favB[0]] ?? 0) >= 25) {
    add({
      id: 'yongshen-b',
      name: '你旺对方所喜',
      score: 9,
      detail: `乙方主用神${favB[0]}在甲方局中占 ${pctA[favB[0]]}%`,
      source: '现代',
    });
  }
  if (unfA[0] && (pctB[unfA[0]] ?? 0) >= 35) {
    add({
      id: 'jishen-a',
      name: '对方助你所忌',
      score: -8,
      detail: `甲方忌神${unfA[0]}在乙方局中偏旺(${pctB[unfA[0]]}%)`,
      source: '现代',
    });
  }
  if (unfB[0] && (pctA[unfB[0]] ?? 0) >= 35) {
    add({
      id: 'jishen-b',
      name: '你助对方所忌',
      score: -8,
      detail: `乙方忌神${unfB[0]}在甲方局中偏旺(${pctA[unfB[0]]}%)`,
      source: '现代',
    });
  }
  // 五行缺补
  for (const [who, mineMissing, otherPct] of [
    ['甲', A.wuxingStrength.missing as string[], pctB],
    ['乙', B.wuxingStrength.missing as string[], pctA],
  ] as const) {
    const filled = mineMissing.filter((el) => (otherPct[el] ?? 0) >= 20);
    if (filled.length) {
      add({
        id: `quebu-${who}`,
        name: `五行缺补(${who}方)`,
        score: 4,
        detail: `${who}方所缺${filled.join('/')}在对方局中充足`,
        source: '现代',
      });
    }
  }

  // ── 5. 纳音年命 [民俗·吕才合婚] ──
  const aNY = (A.nayin.year || '').slice(-1);
  const bNY = (B.nayin.year || '').slice(-1);
  if (aNY && bNY && '金木水火土'.includes(aNY) && '金木水火土'.includes(bNY)) {
    if (SHENG[aNY] === bNY || SHENG[bNY] === aNY)
      add({
        id: 'nayin-sheng',
        name: '年命纳音相生',
        score: 5,
        detail: `${A.nayin.year}×${B.nayin.year}相生(唐·吕才合婚法)`,
        source: '民俗',
      });
    else if (aNY === bNY)
      add({
        id: 'nayin-tong',
        name: '年命纳音比和',
        score: 2,
        detail: `${A.nayin.year}×${B.nayin.year}同气`,
        source: '民俗',
      });
    else if (KE[aNY] === bNY || KE[bNY] === aNY)
      add({
        id: 'nayin-ke',
        name: '年命纳音相克',
        score: -4,
        detail: `${A.nayin.year}×${B.nayin.year}相克(民俗参考)`,
        source: '民俗',
      });
  }

  // ── 6. 日主阴阳 [子平] ──
  if (getGanYinYang(aDG) !== getGanYinYang(bDG)) {
    add({ id: 'yinyang', name: '日主一阴一阳', score: 3, detail: '阴阳互济', source: '子平' });
  }

  const total = Math.min(98, Math.max(5, Math.round(50 + rules.reduce((s, r) => s + r.score, 0))));
  const grade =
    total >= 80 ? '上上' : total >= 65 ? '上' : total >= 50 ? '中' : total >= 35 ? '中下' : '下';

  const fmt = (c: typeof A) =>
    `${c.pillars.year.ganZhi} ${c.pillars.month.ganZhi} ${c.pillars.day.ganZhi} ${c.pillars.hour.ganZhi}`;
  return {
    total,
    grade,
    rules,
    a: { pillars: fmt(A), dayMaster: aDG, favorable: favA },
    b: { pillars: fmt(B), dayMaster: bDG, favorable: favB },
    disclaimer: '合婚为传统文化规则的量化表达,仅供参考娱乐,婚姻幸福取决于双方经营。',
  };
}
