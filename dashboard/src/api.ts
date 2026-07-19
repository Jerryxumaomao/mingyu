/**
 * 看板站浏览器入口:把核心引擎打包暴露为 window.MY
 */
import { baziCalculator } from '../../packages/core/src/bazi/baziCalculator';
import { formatBaziForPrompt } from '../../packages/core/src/bazi/baziAnalysisFormatter';
import { calculateLifeKline } from '../../packages/core/src/bazi/lifeKline';
import { calculateHehun } from '../../packages/core/src/bazi/hehun';
import { recommendOutfit } from '../../packages/core/src/bazi/outfitAdvisor';
import { analyzeLiunianInteractions } from '../../packages/core/src/bazi/liunianInteractions';
import { lookupCity, CHINA_CITIES } from '../../packages/core/src/data/chinaCities';
import { generateXiaoliuren } from '../../packages/core/src/divination/algorithms/xiaoliuren';
// 推演页所需:干支关系判定与藏干(全部确定性小函数)
import {
  isLiuchong,
  isLiuhe,
  isCompleteSanhe,
  getHiddenMainStem,
  getHiddenMediumStem,
  getHiddenResidualStem,
} from '../../packages/core/src/divination/algorithms/_shared/wuxing';
import { getStemWuxing, getBranchWuxing } from '../../packages/core/src/ganzhi/index';

declare global {
  interface Window {
    MY: Record<string, unknown>;
  }
}

window.MY = {
  baziCalculator,
  formatBaziForPrompt,
  calculateLifeKline,
  calculateHehun,
  recommendOutfit,
  analyzeLiunianInteractions,
  lookupCity,
  CHINA_CITIES,
  generateXiaoliuren,
  ganzhi: {
    isLiuchong,
    isLiuhe,
    isCompleteSanhe,
    getHiddenMainStem,
    getHiddenMediumStem,
    getHiddenResidualStem,
    getStemWuxing,
    getBranchWuxing,
  },
};
