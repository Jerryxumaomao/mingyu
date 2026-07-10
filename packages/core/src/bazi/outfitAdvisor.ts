/**
 * @file 五行取象穿搭建议
 * @description 把喜用神五行翻译为颜色/配饰/香调建议,并结合当日干支
 * 给出十神与通关提示。取象表为传统主流口径(木绿火红土黄金白水黑)。
 */
import { BASIC_MAPPINGS } from './baziMappingsData';
import { getWuxing, getTenGod, getTenGodForBranch } from './baziUtils';
import type { Wuxing } from './baziTypes';

interface ElementImagery {
  colors: string[];
  accentColors: string[];
  accessories: string[];
  scentFamilies: string[];
  scentNotes: string[];
}

export const WUXING_IMAGERY: Record<Wuxing, ElementImagery> = {
  木: {
    colors: ['绿色', '青色', '原木色'],
    accentColors: ['薄荷绿', '橄榄绿'],
    accessories: ['木质手串', '绿檀', '翡翠', '绿松石'],
    scentFamilies: ['绿叶调', '草木香'],
    scentNotes: ['雪松', '松针', '青草', '无花果叶'],
  },
  火: {
    colors: ['红色', '橙色', '紫色'],
    accentColors: ['酒红', '砖红', '赤陶色', '亮粉'],
    accessories: ['南红玛瑙', '石榴石', '红碧玺', '暖色皮革', '三角形元素'],
    scentFamilies: ['辛香调', '暖东方调'],
    scentNotes: ['肉桂', '粉红胡椒', '烟草', '香草', '琥珀'],
  },
  土: {
    colors: ['黄色', '棕色', '驼色', '米色'],
    accentColors: ['卡其', '焦糖', '姜黄'],
    accessories: ['黄水晶', '虎眼石', '玉石', '陶瓷饰品'],
    scentFamilies: ['大地调', '木质奶香'],
    scentNotes: ['广藿香', '岩兰草', '檀香', '黄葵'],
  },
  金: {
    colors: ['白色', '银色', '金色'],
    accentColors: ['金属灰', '香槟色'],
    accessories: ['银饰', '白金', '金属链', '圆形元素'],
    scentFamilies: ['醛香调', '清冽白木'],
    scentNotes: ['白麝香', '铃兰', '雪松白木', '灰调鸢尾'],
  },
  水: {
    colors: ['黑色', '藏蓝', '深蓝'],
    accentColors: ['雾蓝', '灰蓝'],
    accessories: ['黑曜石', '海蓝宝', '蓝宝石', '波浪曲线元素'],
    scentFamilies: ['海洋水生调', '清凉调'],
    scentNotes: ['海盐', '水生香调', '薄荷', '龙涎香(清冷向)'],
  },
};

export interface OutfitInput {
  /** 喜用五行,有序,第一个视为主用神 */
  favorableWuxing: string[];
  /** 忌五行 */
  unfavorableWuxing: string[];
  /** 当日天干(可选,用于当日十神/通关提示) */
  dayGan?: string;
  /** 当日地支(可选) */
  dayZhi?: string;
  /** 日主天干(可选,配合当日干支计算十神) */
  dayMasterGan?: string;
}

export interface OutfitAdvice {
  mainElement?: string;
  colors: { main: string[]; accent: string[]; avoid: string[] };
  accessories: string[];
  scents: { families: string[]; notes: string[]; avoid: string[] };
  notes: string[];
}

const isWuxing = (v: string): v is Wuxing => v in WUXING_IMAGERY;

/**
 * 由喜忌五行(+可选当日干支)生成穿搭建议。
 * 通关逻辑:当日地支五行为忌时,忌神所生之五行(泄其气)若恰为喜用,
 * 则提示以该五行"通关",其色系当日应加重。
 */
export function recommendOutfit(input: OutfitInput): OutfitAdvice {
  const favorable = input.favorableWuxing.filter(isWuxing);
  const unfavorable = input.unfavorableWuxing.filter(isWuxing);
  const [primary, ...secondary] = favorable;

  const advice: OutfitAdvice = {
    mainElement: primary,
    colors: {
      main: primary
        ? [...WUXING_IMAGERY[primary].colors, ...WUXING_IMAGERY[primary].accentColors]
        : [],
      accent: secondary.flatMap((e) => WUXING_IMAGERY[e].colors),
      avoid: unfavorable.flatMap((e) => [
        ...WUXING_IMAGERY[e].colors,
        ...WUXING_IMAGERY[e].accentColors,
      ]),
    },
    accessories: favorable.slice(0, 2).flatMap((e) => WUXING_IMAGERY[e].accessories),
    scents: {
      families: favorable.slice(0, 2).flatMap((e) => WUXING_IMAGERY[e].scentFamilies),
      notes: favorable.slice(0, 2).flatMap((e) => WUXING_IMAGERY[e].scentNotes),
      avoid: unfavorable.flatMap((e) => WUXING_IMAGERY[e].scentFamilies),
    },
    notes: [],
  };

  if (primary) {
    advice.notes.push(`主用神为${primary},其色系宜作当日主色调、大面积使用。`);
  }

  const { dayGan, dayZhi, dayMasterGan } = input;
  if (dayGan && dayZhi) {
    const ganEl = getWuxing(dayGan);
    const zhiEl = getWuxing(dayZhi);
    const label = (el: string) =>
      favorable.includes(el as Wuxing) ? '喜' : unfavorable.includes(el as Wuxing) ? '忌' : '中性';
    advice.notes.push(
      `当日干支 ${dayGan}${dayZhi}:天干${dayGan}属${ganEl}(${label(ganEl)}),地支${dayZhi}属${zhiEl}(${label(zhiEl)})。`,
    );
    if (dayMasterGan) {
      advice.notes.push(
        `十神:天干${dayGan}为${getTenGod(dayGan, dayMasterGan)},地支${dayZhi}主气为${getTenGodForBranch(dayZhi, dayMasterGan)}。`,
      );
    }
    // 通关提示:地支为忌时,看忌神所生五行是否为喜用
    if (isWuxing(zhiEl) && unfavorable.includes(zhiEl)) {
      const drain = BASIC_MAPPINGS.WUXING_SHENG[zhiEl];
      if (drain && favorable.includes(drain as Wuxing)) {
        advice.notes.push(
          `当日地支${dayZhi}(${zhiEl})为忌神,宜以${drain}通关(${zhiEl}生${drain}泄其气),${drain}色系当日应比平时更重;同时严格避开${zhiEl}色系及生${zhiEl}的五行色。`,
        );
      }
    }
  }

  return advice;
}
