/**
 * @file 人生K线:逐年运势评分 + 流月OHLC
 * @description 以喜用神契合度为主轴的流年综合评分:
 *   流年干支五行 × 喜忌(主用神权重最高,依次递减)
 * + 大运干支底色(权重减半)
 * + 岁运经典组合扣分(liunianInteractions 七规则)
 * + 流年支与日支六合/三合加分
 * 流月十二个月各自评分,取开(首月)收(末月)高低构成真·K线。
 * 分数为传统规则的量化表达,仅供文化研究与娱乐。
 */
import { baziCalculator } from './baziCalculator';
import { analyzeLiunianInteractions } from './liunianInteractions';
import { getWuxing } from './baziUtils';
import type { Person, Pillars } from './baziTypes';

export interface KlineYear {
  year: number;
  age: number;
  liunianGanZhi: string;
  tenGod: string;
  dayunGanZhi: string | null;
  /** 年综合分 0-100,50 为中性 */
  score: number;
  open: number;
  high: number;
  low: number;
  close: number;
  monthScores: number[];
  events: { id: string; name: string; severity: string }[];
  factors: string[];
}

export interface LifeKlineResult {
  natal: {
    pillars: string;
    dayMaster: string;
    favorableWuxing: string[];
    unfavorableWuxing: string[];
  };
  years: KlineYear[];
}

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
const SAN_HE_GROUPS = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
];
const inSameTrine = (a: string, b: string) =>
  a !== b && SAN_HE_GROUPS.some((g) => g.includes(a) && g.includes(b));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function calculateLifeKline(
  person: Person,
  opts?: { startAge?: number; endAge?: number },
): LifeKlineResult {
  const chart = baziCalculator.calculateBazi(person);
  const ug = chart.analysis.usefulGod as unknown as {
    favorableWuxing?: string[];
    unfavorableWuxing?: string[];
  };
  const favorable = ug.favorableWuxing ?? [];
  const unfavorable = ug.unfavorableWuxing ?? [];
  const dayMaster = chart.dayMaster.gan;
  const pillars = chart.pillars as Pillars;

  // 喜用按序递减,忌神同理(主忌扣得最重)
  const FAV_W = [12, 7, 4, 2];
  const UNFAV_W = [12, 7, 4, 2];
  const elementScore = (el: string): number => {
    const fi = favorable.indexOf(el);
    if (fi >= 0) return FAV_W[Math.min(fi, FAV_W.length - 1)];
    const ui = unfavorable.indexOf(el);
    if (ui >= 0) return -UNFAV_W[Math.min(ui, UNFAV_W.length - 1)];
    return 0;
  };
  const gzScore = (gan: string, zhi: string, ganW: number, zhiW: number) =>
    elementScore(getWuxing(gan)) * ganW + elementScore(getWuxing(zhi)) * zhiW;

  // 年 → 大运干支索引
  const dayunOfYear = new Map<number, string>();
  for (const cycle of chart.luckInfo.cycles ?? []) {
    for (const y of cycle.resolvedYears ?? cycle.years ?? []) {
      dayunOfYear.set(y.year, cycle.ganZhi);
    }
  }

  const startAge = opts?.startAge ?? 1;
  const endAge = opts?.endAge ?? 80;
  const years: KlineYear[] = [];
  let prevClose: number | null = null;

  for (const ln of chart.liunian ?? []) {
    if (ln.age < startAge || ln.age > endAge) continue;
    const lnGan = ln.ganZhi[0];
    const lnZhi = ln.ganZhi[1];
    const dayun = dayunOfYear.get(ln.year) ?? null;
    const factors: string[] = [];

    // 流年主评分(地支力量略重于天干)
    let score = 50 + gzScore(lnGan, lnZhi, 1.0, 1.2);
    if (gzScore(lnGan, lnZhi, 1.0, 1.2) !== 0) {
      factors.push(
        `流年${ln.ganZhi}:干${getWuxing(lnGan)}支${getWuxing(lnZhi)} vs 喜[${favorable.join('')}]忌[${unfavorable.join('')}]`,
      );
    }
    // 大运底色(权重减半)
    if (dayun) {
      const d = gzScore(dayun[0], dayun[1], 0.5, 0.6);
      score += d;
      if (d !== 0) factors.push(`大运${dayun}底色 ${d > 0 ? '+' : ''}${d.toFixed(1)}`);
    }
    // 岁运经典组合
    const events = analyzeLiunianInteractions({
      pillars,
      dayMaster,
      liunianGanZhi: ln.ganZhi,
      dayunGanZhi: dayun ?? undefined,
    }).map((e) => ({ id: e.id, name: e.name, severity: e.severity }));
    for (const e of events) {
      const penalty = e.severity === 'major' ? -12 : -6;
      score += penalty;
      factors.push(`${e.name} ${penalty}`);
    }
    // 流年支合日支(夫妻宫得合,主顺)
    if (LIU_HE[lnZhi] === pillars.day.zhi) {
      score += 4;
      factors.push(`流年支${lnZhi}六合日支${pillars.day.zhi} +4`);
    } else if (inSameTrine(lnZhi, pillars.day.zhi)) {
      score += 3;
      factors.push(`流年支${lnZhi}三合日支${pillars.day.zhi} +3`);
    }
    score = clamp(Math.round(score * 10) / 10, 2, 98);

    // 流月:围绕年分波动,构成 OHLC
    const monthScores: number[] = [];
    for (let m = 1; m <= 12; m++) {
      let lm;
      try {
        lm = baziCalculator.calculateLiuyue(ln.year, m, dayMaster);
      } catch {
        monthScores.push(score);
        continue;
      }
      const dev = gzScore(lm.gan ?? lm.ganZhi[0], lm.zhi ?? lm.ganZhi[1], 0.6, 0.7);
      monthScores.push(clamp(Math.round((score + dev) * 10) / 10, 2, 98));
    }
    const open = prevClose ?? monthScores[0];
    const close = monthScores[monthScores.length - 1];
    years.push({
      year: ln.year,
      age: ln.age,
      liunianGanZhi: ln.ganZhi,
      tenGod: ln.tenGod,
      dayunGanZhi: dayun,
      score,
      open,
      high: Math.max(open, ...monthScores),
      low: Math.min(open, ...monthScores),
      close,
      monthScores,
      events,
      factors,
    });
    prevClose = close;
  }

  return {
    natal: {
      pillars: `${pillars.year.ganZhi} ${pillars.month.ganZhi} ${pillars.day.ganZhi} ${pillars.hour.ganZhi}`,
      dayMaster,
      favorableWuxing: favorable,
      unfavorableWuxing: unfavorable,
    },
    years,
  };
}
