/**
 * 日运:流日干支 × 喜忌 的轻量评分 + 宜忌事项(离线规则,毫秒级)
 * 权重与 lifeKline 同源(干1.0/支1.2,六合日支+4/三合+3,六冲日支-5),
 * 分档:≥68大吉 / ≥56吉 / ≥44平 / ≥32凶 / <32大凶。仅供文化研究与娱乐。
 */
const MY = require('../lib/mingyu.js');

const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const LIU_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const LIU_CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const SAN_HE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const inTrine = (a, b) => a !== b && SAN_HE.some((g) => g.indexOf(a) > -1 && g.indexOf(b) > -1);

const YI_POOL = {
  木: ['动身出行', '启动新计划', '学习进修'],
  火: ['社交表达', '重要汇报', '大方亮相'],
  土: ['签约落定', '整理财务', '经营关系'],
  金: ['收尾结算', '决断取舍', '断舍离'],
  水: ['深度思考', '复盘写作', '倾听沟通'],
};
const JI_POOL = {
  木: ['冲动扩张', '意气用事'],
  火: ['争执上火', '熬夜透支'],
  土: ['固执己见', '拖延观望'],
  金: ['硬碰硬', '苛责较真'],
  水: ['优柔寡断', '轻信传言'],
};
const BANDS = [[68, '大吉'], [56, '吉'], [44, '平'], [32, '凶'], [-1, '大凶']];

/** natal: klineCache 的 natal(pillars 字符串 + favorable/unfavorableWuxing) */
const score = (dateObj, natal) => {
  const fav = natal.favorableWuxing || [];
  const unf = natal.unfavorableWuxing || [];
  const FAV_W = [12, 7, 4, 2];
  const eScore = (el) => {
    const fi = fav.indexOf(el);
    if (fi >= 0) return FAV_W[Math.min(fi, 3)];
    const ui = unf.indexOf(el);
    if (ui >= 0) return -FAV_W[Math.min(ui, 3)];
    return 0;
  };
  const y = dateObj.getFullYear(), m = dateObj.getMonth() + 1, d = dateObj.getDate();
  const day = MY.baziCalculator.calculatePillars({ year: y, month: m, day: d, timeIndex: 6, gender: 'male' }).pillars.day;
  const gan = day.ganZhi[0], zhi = day.ganZhi[1];
  const natalDayZhi = (natal.pillars || '').split(' ')[2] ? natal.pillars.split(' ')[2][1] : null;
  let s = 50 + eScore(GAN_WX[gan]) * 1.0 + eScore(ZHI_WX[zhi]) * 1.2;
  const notes = [];
  if (natalDayZhi) {
    if (LIU_HE[zhi] === natalDayZhi) { s += 4; notes.push(`流日${zhi}六合命局日支,人和顺遂`); }
    else if (inTrine(zhi, natalDayZhi)) { s += 3; notes.push(`流日${zhi}三合命局日支,合作有缘`); }
    else if (LIU_CHONG[zhi] === natalDayZhi) { s -= 5; notes.push(`流日${zhi}冲命局日支,易生变动,稳字当头`); }
  }
  s = Math.min(98, Math.max(2, Math.round(s * 10) / 10));
  const band = BANDS.find(([lo]) => s >= lo)[1];
  // 宜:当日干支里"喜用"的那一行五行;都不喜则给中性事项
  const dayEls = [GAN_WX[gan], ZHI_WX[zhi]];
  const favEl = dayEls.find((e) => fav.indexOf(e) > -1);
  const unfEl = dayEls.find((e) => unf.indexOf(e) > -1);
  const yi = favEl ? YI_POOL[favEl] : ['按部就班', '整理内务', '养精蓄锐'];
  const ji = unfEl ? JI_POOL[unfEl] : (band === '凶' || band === '大凶' ? ['大开大合', '仓促决定'] : ['贪多求快']);
  return { date: `${m}月${d}日`, iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, gz: day.ganZhi, score: s, band, yi, ji, notes };
};

/** 连续日序列:offsetStart~offsetEnd(相对今天的天数) */
const series = (natal, offsetStart, offsetEnd) => {
  const out = [];
  for (let i = offsetStart; i <= offsetEnd; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ ...score(d, natal), offset: i });
  }
  return out;
};

module.exports = { score, series };
