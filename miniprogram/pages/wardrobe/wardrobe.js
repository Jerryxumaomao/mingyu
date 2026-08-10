const MATERIALS = require('../../data/materials.js');
const PERFUMES = require('../../data/perfumes.js');
const wardrobe = require('../../utils/wardrobe.js');
const perfumeAI = require('../../utils/perfume-ai.js');

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
    aiLoading: false, aiError: '', aiResult: null, aiQuery: '',
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
    const raw = e.detail.value.trim();
    const kw = raw.toLowerCase();
    this._aiRequestSeq = (this._aiRequestSeq || 0) + 1;
    if (!kw) {
      this.setData({
        kw: '', results: [], showCustom: false, customName: '',
        aiLoading: false, aiError: '', aiResult: null, aiQuery: '',
      });
      return;
    }
    const results = PERFUMES
      .filter((p) => p.n.toLowerCase().includes(kw) || p.en.includes(kw))
      .slice(0, 8)
      .map((p) => ({ ...p, d: wardrobe.marks(p.wx) }));
    this.setData({
      kw: raw,
      results,
      showCustom: !results.length,
      customName: '',
      aiLoading: false,
      aiError: '',
      aiResult: null,
      aiQuery: '',
    });
  },
  addPerfume(e) {
    const p = this.data.results[e.currentTarget.dataset.i];
    if (this.data.perfumes.some((x) => x.n === p.n)) {
      wx.showToast({ title: '已在香水架上', icon: 'none' }); return;
    }
    this.setData({ perfumes: [...this.data.perfumes, { n: p.n, wx: p.wx, f: p.f, d: wardrobe.marks(p.wx) }], kw: '', results: [] }, () => this.persist());
    wx.showToast({ title: '已上架', icon: 'success' });
  },
  onCustomName(e) {
    const customName = e.detail.value;
    const changed = perfumeAI.normalizeQuery(customName || this.data.kw).toLowerCase()
      !== perfumeAI.normalizeQuery(this.data.aiQuery).toLowerCase();
    if (changed) this._aiRequestSeq = (this._aiRequestSeq || 0) + 1;
    this.setData({
      customName,
      ...(changed ? { aiLoading: false, aiError: '', aiResult: null, aiQuery: '' } : {}),
    });
  },
  lookupPerfume() {
    const name = perfumeAI.normalizeQuery(this.data.customName || this.data.kw);
    if (!name) {
      wx.showToast({ title: '先填香水全名', icon: 'none' });
      return Promise.resolve();
    }
    if (this.data.aiLoading) return this._aiPromise || Promise.resolve();
    if (this.data.aiResult && perfumeAI.normalizeQuery(this.data.aiQuery).toLowerCase() === name.toLowerCase()) {
      wx.showToast({ title: '已查到，请确认', icon: 'none' });
      return Promise.resolve(this.data.aiResult);
    }

    const seq = (this._aiRequestSeq || 0) + 1;
    this._aiRequestSeq = seq;
    this.setData({ aiLoading: true, aiError: '', aiResult: null, aiQuery: name });
    const request = perfumeAI.resolvePerfume(name)
      .then((result) => {
        if (seq !== this._aiRequestSeq) return result;
        if (!result.ok) {
          this.setData({
            aiError: result.message || '暂时查不到可靠资料，请手动选择。',
            aiResult: null,
          });
          return result;
        }
        const perfume = result.perfume;
        this.setData({
          aiError: '',
          aiResult: {
            ...perfume,
            d: wardrobe.marks(perfume.wx),
          },
        });
        return result;
      })
      .catch((error) => {
        if (seq === this._aiRequestSeq) {
          this.setData({
            aiError: error.message || '联网查询失败，请手动选择香调。',
            aiResult: null,
          });
        }
        return null;
      })
      .then((result) => {
        if (seq === this._aiRequestSeq) this.setData({ aiLoading: false });
        return result;
      });
    this._aiPromise = request;
    return request;
  },
  confirmAiPerfume() {
    const result = this.data.aiResult;
    if (!result) return;
    if (this.data.perfumes.some((item) => item.n.toLowerCase() === result.n.toLowerCase())) {
      wx.showToast({ title: '已在香水架上', icon: 'none' });
      return;
    }
    const perfume = { n: result.n, wx: result.wx, f: result.f, d: wardrobe.marks(result.wx) };
    this.setData({
      perfumes: [...this.data.perfumes, perfume],
      kw: '', results: [], showCustom: false, customName: '',
      aiLoading: false, aiError: '', aiResult: null, aiQuery: '',
    }, () => this.persist());
    wx.showToast({ title: '已上架', icon: 'success' });
  },
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
