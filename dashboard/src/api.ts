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
};
