const MATERIALS = require('../../data/materials.js');
const PERFUMES = require('../../data/perfumes.js');
const wardrobe = require('../../utils/wardrobe.js');

// 展示用中性香调分组;首字符仍是内部归类键,截取逻辑不变
const WX_GROUPS = ['木质绿意(绿叶/草本)', '火暖甜香(辛香/东方)', '土沉稳调(檀香/大地)', '金净白调(白花/皂感)', '水清凉调(海洋/水生)'];

const materialOptions = (owned = []) => MATERIALS.map((item) => ({
  ...item,
  selected: owned.includes(item.n),
}));

Page({
  data: {
    mats: materialOptions(), owned: [], perfumes: [],
    kw: '', results: [],
    showCustom: false, customName: '', groups: WX_GROUPS, gIdx: 0,
  },
  onLoad() {
    const w = wardrobe.get();
    // 旧存量条目补上分布标记(●◐○)展示字段
    this.setData({
      mats: materialOptions(w.mats),
      owned: w.mats,
      perfumes: w.perfumes.map((p) => ({ ...p, d: wardrobe.marks(p.wx) })),
    });
  },
  persist() {
    wardrobe.save({ mats: this.data.owned, perfumes: this.data.perfumes });
  },
  toggleMat(e) {
    const n = e.currentTarget.dataset.n;
    const owned = this.data.owned.includes(n)
      ? this.data.owned.filter((x) => x !== n)
      : [...this.data.owned, n];
    this.setData({ mats: materialOptions(owned), owned }, () => this.persist());
  },
  onKw(e) {
    const kw = e.detail.value.trim().toLowerCase();
    if (!kw) { this.setData({ kw: '', results: [], showCustom: false }); return; }
    const results = PERFUMES
      .filter((p) => p.n.toLowerCase().includes(kw) || p.en.includes(kw))
      .slice(0, 8)
      .map((p) => ({ ...p, d: wardrobe.marks(p.wx) }));
    this.setData({ kw: e.detail.value.trim(), results, showCustom: !results.length });
  },
  addPerfume(e) {
    const p = this.data.results[e.currentTarget.dataset.i];
    if (this.data.perfumes.some((x) => x.n === p.n)) {
      wx.showToast({ title: '已在香水架上', icon: 'none' }); return;
    }
    this.setData({ perfumes: [...this.data.perfumes, { n: p.n, wx: p.wx, f: p.f, d: wardrobe.marks(p.wx) }], kw: '', results: [] }, () => this.persist());
    wx.showToast({ title: '已上架', icon: 'success' });
  },
  onCustomName(e) { this.setData({ customName: e.detail.value }); },
  onGroup(e) { this.setData({ gIdx: +e.detail.value }); },
  addCustom() {
    const name = (this.data.customName || this.data.kw || '').trim();
    if (!name) { wx.showToast({ title: '先填香水名', icon: 'none' }); return; }
    if (this.data.perfumes.some((x) => x.n === name)) { wx.showToast({ title: '已在香水架上', icon: 'none' }); return; }
    const g = this.data.groups[this.data.gIdx];
    const p = { n: name, wx: [g[0]], f: g, custom: true, d: wardrobe.marks([g[0]]) };
    this.setData({ perfumes: [...this.data.perfumes, p], kw: '', results: [], showCustom: false, customName: '' }, () => this.persist());
    wx.showToast({ title: '已存入个人库', icon: 'success' });
  },
  removePerfume(e) {
    const i = e.currentTarget.dataset.i;
    const perfumes = this.data.perfumes.filter((_, idx) => idx !== i);
    this.setData({ perfumes }, () => this.persist());
  },
});
