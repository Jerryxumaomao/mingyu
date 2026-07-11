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

/**
 * 用喜用五行在衣橱里挑适配项。
 * 全部喜用都算适配(用户已有的东西本就有限,只认前二会常年空结果),
 * 但按喜用次序排序,前二标"主"。
 */
const match = (favorable) => {
  const fav = favorable || [];
  const w = get();
  const rank = (xs) => Math.min(...xs.map((x) => (fav.indexOf(x) === -1 ? 99 : fav.indexOf(x))));
  const mats = w.mats
    .map((n) => MATERIALS.find((m) => m.n === n))
    .filter((m) => m && fav.includes(m.wx))
    .sort((a, b) => rank([a.wx]) - rank([b.wx]))
    .map((m) => `${m.n}(${m.wx}${fav.indexOf(m.wx) < 2 ? '·主' : ''})`);
  const perfumes = w.perfumes
    .filter((p) => (p.wx || []).some((x) => fav.includes(x)))
    .sort((a, b) => rank(a.wx) - rank(b.wx))
    .map((p) => `${p.n} · ${p.f}${rank(p.wx) < 2 ? ' · 主用' : ''}`);
  return { mats, perfumes, empty: !w.mats.length && !w.perfumes.length };
};

module.exports = { get, save, match };
