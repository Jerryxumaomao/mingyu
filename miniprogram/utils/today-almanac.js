/**
 * 今日黄历 · 全部基于"今天这一天"(人人相同,零个人信息)
 * 数据来源:今日流日/流月干支(引擎 calculatePillars,只吃日期)。
 * 今日指数用正统"建除十二神"黄历算法——由日支相对月支的位置决定,逐日变化、
 * 与任何个人资料无关,是万年历类应用的标准内容。仅供文化欣赏与娱乐。
 */
const MY = require('../lib/mingyu.js');
const { WX_COLOR, hexOf } = require('./colormap.js');

const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
// 生肖 ↔ 地支
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
// 建除十二神(日支相对月支的序号 0..11)
const VALUE_GODS = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
// 值神 → 五档(旺/順/平/緩/守,对应 qian-0..4 大字)+ 一句今日宜忌(生活化)
const GOD_BAND = { 成: 0, 开: 0, 除: 0, 定: 1, 收: 1, 建: 1, 满: 2, 平: 2, 执: 2, 危: 3, 闭: 3, 破: 4 };
const GOD_HINT = {
  建: { yi: '开启新计划、出门走走', ji: '不宜大动土木' },
  除: { yi: '除旧布新、打扫整理', ji: '不宜久留旧事' },
  满: { yi: '祈愿、张罗喜事', ji: '不宜滋补进补' },
  平: { yi: '按部就班、修整环境', ji: '不宜争执诉讼' },
  定: { yi: '定下约定、安顿身心', ji: '不宜远行' },
  执: { yi: '收拢事务、专注一件事', ji: '不宜开张移居' },
  破: { yi: '破旧立新、就医调理', ji: '不宜重大决定' },
  危: { yi: '稳字当头、早点休息', ji: '不宜登高涉险' },
  成: { yi: '开张、落定、结缘', ji: '不宜口舌是非' },
  收: { yi: '收纳、进账、蓄力', ji: '不宜出货远行' },
  开: { yi: '开业、入学、社交', ji: '不宜消沉' },
  闭: { yi: '沉淀、收心、独处', ji: '不宜开张出行' },
};
const BAND_CH = ['旺', '順', '平', '緩', '守'];
const BAND_COLOR = ['#b5432f', '#c96f2f', '#8a8272', '#3f7050', '#2f5540'];
// 生肖今日:日支 vs 生肖支 的关系
const LIU_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const LIU_CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const SAN_HE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const inTrine = (a, b) => a !== b && SAN_HE.some((g) => g.indexOf(a) > -1 && g.indexOf(b) > -1);

function todayDayPillar() {
  const d = new Date();
  const p = MY.baziCalculator.calculatePillars({
    year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), timeIndex: 6, gender: 'male',
  });
  return { day: p.pillars.day, month: p.pillars.month };
}

/** 今日总览:五行、色、指数(建除)、宜忌 */
function overview() {
  const { day, month } = todayDayPillar();
  const el = GAN_WX[day.gan]; // 当值五行 = 日干五行
  const dayZhiIdx = ZHI.indexOf(day.zhi);
  const monZhiIdx = ZHI.indexOf(month.zhi);
  const godIdx = (dayZhiIdx - monZhiIdx + 12) % 12;
  const god = VALUE_GODS[godIdx];
  const qi = GOD_BAND[god];
  const hint = GOD_HINT[god];
  // 今日色:以当值五行为主色调,取引擎配色
  let colors = { main: [], accent: [] };
  let acc = []; let scent = [];
  try {
    const adv = MY.recommendOutfit({
      favorableWuxing: [el], unfavorableWuxing: [],
      dayGan: day.gan, dayZhi: day.zhi, dayMasterGan: day.gan,
    });
    colors = {
      main: (adv.colors.main || []).slice(0, 3).map((n) => ({ n, c: hexOf(n) })),
      accent: (adv.colors.accent || []).slice(0, 2).map((n) => ({ n, c: hexOf(n) })),
    };
    acc = (adv.accessories || []).slice(0, 6);
    scent = (adv.scents && adv.scents.families) || [];
  } catch (e) { /* 配色拿不到就只显示主色块 */ }
  const dd = new Date();
  return {
    date: `${dd.getMonth() + 1}月${dd.getDate()}日`,
    element: el, elementColor: WX_COLOR[el],
    god, qi, band: BAND_CH[qi], bandColor: BAND_COLOR[qi],
    yi: hint.yi, ji: hint.ji,
    colors, acc, scent,
    elementLine: `今日${el}气当值,以${el}色系为底,穿搭添一分应景。`,
    dayZhi: day.zhi,
  };
}

/** 十二生肖今日:日支 vs 各生肖支,列全 12 个(公共文化,无个人信息) */
function zodiacs(dayZhi) {
  const dz = dayZhi || todayDayPillar().day.zhi;
  return ANIMALS.map((animal, i) => {
    const zhi = ZHI[i];
    let tag; let text; let lv;
    if (zhi === dz) { tag = '本命'; lv = 1; text = '值日之日,稳中求进,别急于求成。'; }
    else if (LIU_HE[zhi] === dz) { tag = '相合'; lv = 0; text = '今日与你相合,人和顺遂,宜谈事结缘。'; }
    else if (inTrine(zhi, dz)) { tag = '有缘'; lv = 0; text = '三合助力,合作有缘,适合携手推进。'; }
    else if (LIU_CHONG[zhi] === dz) { tag = '宜静'; lv = 3; text = '今日易有变动,静心稳住,不宜冒进。'; }
    else { tag = '平和'; lv = 2; text = '平平顺顺的一天,按自己的节奏来。'; }
    return { animal, tag, lv, text, color: ['#b5432f', '#c96f2f', '#8a8272', '#3f7050'][lv] };
  });
}

module.exports = { overview, zodiacs, GAN_WX, ZHI_WX };
