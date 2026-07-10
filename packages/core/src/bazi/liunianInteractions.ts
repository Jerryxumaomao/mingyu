/**
 * @file 岁运联动经典组合
 * @description 检测流年(可选叠加大运)与原局之间的经典十神/干支组合,
 * 输出结构化提示。规则为传统命理通行口径,severity 只表示传统上的
 * 重视程度,不构成吉凶断言。
 */
import { getTenGod } from './baziUtils';
import type { Pillars } from './baziTypes';

export interface LiunianInteraction {
  id: string;
  name: string;
  severity: 'info' | 'caution' | 'major';
  description: string;
}

export interface LiunianInteractionInput {
  /** 原局四柱 */
  pillars: Pillars;
  /** 日主天干 */
  dayMaster: string;
  /** 流年干支,如 "丙午" */
  liunianGanZhi: string;
  /** 当前大运干支(可选),如 "戊寅" */
  dayunGanZhi?: string;
}

const ZHI_CHONG: Record<string, string> = {
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

/** 阳干羊刃(帝旺之支);阴干羊刃流派争议大,此处不判 */
const YANG_REN: Record<string, string> = {
  甲: '卯',
  丙: '午',
  戊: '午',
  庚: '酉',
  壬: '子',
};

const visibleStems = (pillars: Pillars): string[] => [
  pillars.year.gan,
  pillars.month.gan,
  pillars.hour.gan,
];

const allBranches = (pillars: Pillars): string[] => [
  pillars.year.zhi,
  pillars.month.zhi,
  pillars.day.zhi,
  pillars.hour.zhi,
];

/**
 * 检测流年与原局/大运的经典组合。所有规则基于天干十神与地支冲合,
 * 输入只需四柱与流年干支,不依赖完整命盘对象。
 */
export function analyzeLiunianInteractions(input: LiunianInteractionInput): LiunianInteraction[] {
  const { pillars, dayMaster, liunianGanZhi, dayunGanZhi } = input;
  if (liunianGanZhi.length < 2) return [];
  const lnGan = liunianGanZhi[0];
  const lnZhi = liunianGanZhi[1];
  const results: LiunianInteraction[] = [];

  const lnGanGod = getTenGod(lnGan, dayMaster);
  const natalGods = visibleStems(pillars).map((g) => getTenGod(g, dayMaster));

  // 1. 岁运并临:流年干支与大运干支完全相同
  if (dayunGanZhi && dayunGanZhi === liunianGanZhi) {
    results.push({
      id: 'sui-yun-bing-lin',
      name: '岁运并临',
      severity: 'major',
      description: `流年与大运同为${liunianGanZhi},同一干支之力双倍加临,传统视为该年能量高度集中,吉凶皆被放大,宜谨慎行事、避免极端决策。`,
    });
  }

  // 2. 天克地冲:流年干克日干,且流年支冲日支
  if (GAN_KE[lnGan] === dayMaster && ZHI_CHONG[lnZhi] === pillars.day.zhi) {
    results.push({
      id: 'tian-ke-di-chong',
      name: '天克地冲(冲克日柱)',
      severity: 'major',
      description: `流年${liunianGanZhi}天干克日主${dayMaster}、地支冲日支${pillars.day.zhi},上下同攻日柱,传统认为该年动荡明显,健康与重大变动需多留意。`,
    });
  }

  // 3. 伤官见官
  const hasNatal = (god: string) => natalGods.includes(god);
  if ((lnGanGod === '正官' && hasNatal('伤官')) || (lnGanGod === '伤官' && hasNatal('正官'))) {
    results.push({
      id: 'shang-guan-jian-guan',
      name: '伤官见官',
      severity: 'caution',
      description:
        '伤官与正官同现(原局透一者,流年引出另一者),传统认为易生口舌是非、与规则/上级的冲突,签约与官非事宜宜谨慎。',
    });
  }

  // 4. 比劫夺财
  if (
    (['比肩', '劫财'].includes(lnGanGod) && (hasNatal('正财') || hasNatal('偏财'))) ||
    (['正财', '偏财'].includes(lnGanGod) && (hasNatal('比肩') || hasNatal('劫财')))
  ) {
    results.push({
      id: 'bi-jie-duo-cai',
      name: '比劫夺财',
      severity: 'caution',
      description:
        '比劫与财星同现,传统取象为"兄弟分财":当年破财、借贷纠纷、合伙分歧风险上升,不宜大额出借与仓促合伙。',
    });
  }

  // 5. 枭神夺食
  if ((lnGanGod === '偏印' && hasNatal('食神')) || (lnGanGod === '食神' && hasNatal('偏印'))) {
    results.push({
      id: 'xiao-shen-duo-shi',
      name: '枭神夺食',
      severity: 'caution',
      description:
        '偏印(枭神)克制食神,传统取象为思虑压制表达、福气受夺:创作输出、饮食健康与合作交付宜多加照看。',
    });
  }

  // 6. 羊刃逢冲(仅阳干日主)
  const renZhi = YANG_REN[dayMaster];
  if (renZhi && allBranches(pillars).includes(renZhi) && ZHI_CHONG[lnZhi] === renZhi) {
    results.push({
      id: 'yang-ren-feng-chong',
      name: '羊刃逢冲',
      severity: 'major',
      description: `日主${dayMaster}之羊刃${renZhi}在原局,流年${lnZhi}冲之,传统认为刃星受激,当年易有意外冲撞、外伤与冲动决策,宜守不宜攻。`,
    });
  }

  // 7. 流年冲提纲(冲月支)
  if (ZHI_CHONG[lnZhi] === pillars.month.zhi) {
    results.push({
      id: 'chong-ti-gang',
      name: '流年冲提纲',
      severity: 'caution',
      description: `流年支${lnZhi}冲月支${pillars.month.zhi}(提纲),月令为全局枢纽,传统认为该年根基易动:居所、职业等基本盘变动概率升高。`,
    });
  }

  return results;
}
