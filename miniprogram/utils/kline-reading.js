/**
 * 人生K线 · 近年走势规则化解读(纯查表拼文案,离线可用)
 * 素材全部来自引擎逐年输出:干支五行 vs 喜忌、大运底色、岁运事件(events)、
 * 合日支(factors 文本)、分数走向。窗口:去年 ~ 未来三年,共五年。
 */
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

const yearText = (yr, natal, prev) => {
  const fav = natal.favorableWuxing || [];
  const unf = natal.unfavorableWuxing || [];
  const gWx = GAN_WX[yr.liunianGanZhi[0]];
  const zWx = ZHI_WX[yr.liunianGanZhi[1]];
  const favHit = [gWx, zWx].filter((w) => fav.includes(w));
  const unfHit = [gWx, zWx].filter((w) => unf.includes(w));
  // 喜用有主次:排前二的才算"当令",排后面的只是"次喜"
  const favRank = favHit.length ? Math.min(...favHit.map((w) => fav.indexOf(w))) : 99;
  const parts = [];
  if (favHit.length === 2 && favRank < 2) parts.push(favHit[0] === favHit[1] ? `干支一片${favHit[0]},喜用当令` : '干支皆喜,顺水行舟');
  else if (favHit.length === 2) parts.push('干支为次级喜用,平顺但力道有限');
  else if (favHit.length === 1 && !unfHit.length) parts.push(favRank < 2 ? `${favHit[0]}为主喜用,有实质帮扶` : `${favHit[0]}为次喜,小有助益`);
  else if (unfHit.length === 2) parts.push(unfHit[0] === unfHit[1] ? `干支一片${unfHit[0]},忌神当令,阻力明显` : '干支皆忌,宜守不宜攻');
  else if (unfHit.length === 1 && !favHit.length) parts.push(`${unfHit[0]}为忌,略有消耗`);
  else if (favHit.length && unfHit.length) parts.push('喜忌相杂,起伏之年');
  else parts.push('五行中性,平平之年');
  if (yr.dayunGanZhi) {
    const dHit = [GAN_WX[yr.dayunGanZhi[0]], ZHI_WX[yr.dayunGanZhi[1]]];
    const dFav = dHit.filter((w) => fav.includes(w)).length;
    const dUnf = dHit.filter((w) => unf.includes(w)).length;
    if (dFav && !dUnf) parts.push(`大运${yr.dayunGanZhi}托底`);
    else if (dUnf && !dFav) parts.push(`大运${yr.dayunGanZhi}底色偏紧`);
  }
  if ((yr.factors || []).some((f) => f.indexOf('合日支') > -1)) parts.push('流年合日支,人和顺遂');
  if ((yr.events || []).length) parts.push(`留意:${yr.events.map((e) => e.name).join('、')}`);
  let dirTxt = '';
  if (prev) {
    const d = yr.score - prev.score;
    dirTxt = d >= 8 ? ',较上年明显走高' : d <= -8 ? ',较上年明显回落' : '';
  }
  const band = yr.score >= 67 ? '高位' : yr.score >= 45 ? '中位' : '低位';
  return { band, text: `${band}${dirTxt}。${parts.join(';')}。` };
};

/** k = {natal, years};返回 {lines:[{year,gz,score,up,text}], summary} 或 null */
const readRecent = (k, curYear) => {
  const win = (k.years || []).filter((y) => y.year >= curYear - 1 && y.year <= curYear + 3);
  if (!win.length) return null;
  const lines = win.map((yr, i) => {
    const r = yearText(yr, k.natal, i > 0 ? win[i - 1] : (k.years || []).find((y) => y.year === yr.year - 1));
    return {
      year: yr.year, gz: yr.liunianGanZhi, score: Math.round(yr.score),
      now: yr.year === curYear, up: r.band === '高位', down: r.band === '低位',
      text: r.text,
    };
  });
  const best = [...win].sort((a, b) => b.score - a.score)[0];
  const worst = [...win].sort((a, b) => a.score - b.score)[0];
  let summary;
  if (best.score - worst.score < 10) {
    summary = '这五年整体波澜不大,按自己的节奏稳步推进即可。';
  } else {
    summary = `这段里的高点在 ${best.year} ${best.liunianGanZhi}(${Math.round(best.score)}分),关键动作尽量放在这样的年份;${worst.year} ${worst.liunianGanZhi}(${Math.round(worst.score)}分)相对承压,宜守成、养精蓄锐,避免大开大合。`;
  }
  return { lines, summary };
};

module.exports = { readRecent };
