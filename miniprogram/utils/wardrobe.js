/**
 * 我的衣橱 · 本地存储层(配饰材质 + 香水)
 * 结构:{ mats: ['银饰',...], perfumes: [{ n, wx:['金'], f, custom? }] }
 */
const KEY = 'wz-wardrobe';
const MATERIALS = require('../data/materials.js');

const get = () => {
  try {
    const w = wx.getStorageSync(KEY);
    return w && w.mats ? w : { mats: [], perfumes: [] };
  } catch (e) { return { mats: [], perfumes: [] }; }
};
const save = (w) => { try { wx.setStorageSync(KEY, w); } catch (e) { /* 存不进则本次会话内有效 */ } };

/** 多属性分布展示:['火','土','木'] → 火●土◐木○ */
const MARKS = ['●', '◐', '○'];
const marks = (wx) => (wx || []).map((w, i) => w + (MARKS[i] || '○')).join('');

/**
 * 用喜用五行在衣橱里挑适配项。
 * 材质:单属性,命中喜用即适配,按喜用次序排,前二标"主"。
 * 香水:多属性分布(wx 有序=[主●,辅◐,微○]),按 fragrance-library 规则分档——
 *   忌神做主● 不推;主●∈喜用前二=首选;主●或辅◐∈喜用=换风格;仅微○命中=点到即可。
 */
const match = (favorable, unfavorable) => {
  const fav = favorable || [];
  const unf = unfavorable || [];
  const w = get();
  const mats = w.mats
    .map((n) => MATERIALS.find((m) => m.n === n))
    .filter((m) => m && fav.includes(m.wx))
    .sort((a, b) => fav.indexOf(a.wx) - fav.indexOf(b.wx))
    .map((m) => `${m.n}${fav.indexOf(m.wx) < 2 ? '(主推)' : ''}`);
  const TIER = ['首选', '换风格', '点到即可'];
  const scored = [];
  w.perfumes.forEach((p) => {
    const arr = p.wx || [];
    const main = arr[0];
    if (unf.indexOf(main) > -1) return; // 忌神主调不推(辅/微带忌不碍事)
    let tier = null;
    if (fav.slice(0, 2).indexOf(main) > -1) tier = 0;
    else if (fav.indexOf(main) > -1 || (arr[1] && fav.indexOf(arr[1]) > -1)) tier = 1;
    else if (arr[2] && fav.indexOf(arr[2]) > -1) tier = 2;
    if (tier === null) return;
    scored.push({ tier, s: `${p.n} · ${TIER[tier]}` });
  });
  scored.sort((a, b) => a.tier - b.tier);
  return { mats, perfumes: scored.map((x) => x.s), empty: !w.mats.length && !w.perfumes.length };
};

module.exports = { get, save, match, marks };
