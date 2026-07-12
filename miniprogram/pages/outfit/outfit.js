const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const wardrobe = require('../../utils/wardrobe.js');
const klineCache = require('../../utils/kline-cache.js');
const { hexOf } = require('../../utils/colormap.js');
const TIMES = ['00:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00', '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00', '23:00-24:00'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

Page({
  data: {
    date: '1996-11-23', times: TIMES, ti: 2, genders: ['男', '女'], gi: 0,
    target: today(), r: null, busy: false, showForm: false, isSelf: true, owned: null,
  },
  onLoad() {
    const p = profile.get();
    if (p) this.setData({ date: p.date, ti: p.ti, gi: p.gi });
  },
  onShow() {
    const p = profile.get();
    const runKey = p ? `${p.date}|${p.ti}|${p.gi}|${today()}` : '';
    // 无结果、改过档案、或跨天了:都按档案重新生成
    const stale = this.data.r && this.data.isSelf && this._runKey !== runKey;
    if (p && (!this.data.r || stale) && !this.data.busy) {
      this.setData({ date: p.date, ti: p.ti, gi: p.gi, target: today() }, () => this.run());
    } else if (this.data.r && this.data.isSelf && this._fav) {
      // 从"我的衣橱"改完回来:只刷新适配部分
      this.setData({ owned: wardrobe.match(this._fav, this._unf || []) });
    }
  },
  onShareAppMessage() { return { title: '今日穿搭色,给你挑好了', path: '/pages/outfit/outfit' }; },
  onShareTimeline() { return { title: '今日穿搭色,给你挑好了' }; },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  onTarget(e) { this.setData({ target: e.detail.value }); },
  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  goWardrobe() { wx.navigateTo({ url: '/pages/wardrobe/wardrobe' }); },
  run() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    wx.showLoading({ title: '正在调色', mask: true });
    setTimeout(() => {
      const [ty, tm, td] = this.data.target.split('-').map(Number);
      const gender = this.data.gi === 0 ? 'male' : 'female';
      try {
        // 优先吃启动预载的全程缓存(喜忌/日主都在里面),免去整盘重算
        const cached = klineCache.get(this.data.date, this.data.ti, this.data.gi);
        let favArr, unfArr, dayMasterGan;
        if (cached) {
          favArr = cached.natal.favorableWuxing || [];
          unfArr = cached.natal.unfavorableWuxing || [];
          dayMasterGan = cached.natal.dayMaster;
        } else {
          const chart = MY.baziCalculator.calculateBazi({ ...profile.personFrom(this.data.date, this.data.ti, this.data.gi), strengthModel: 'classic-calibrated' });
          const ug0 = chart.analysis.usefulGod;
          favArr = ug0.favorableWuxing || [];
          unfArr = ug0.unfavorableWuxing || [];
          dayMasterGan = chart.dayMaster.gan;
        }
        const day = MY.baziCalculator.calculatePillars({ year: ty, month: tm, day: td, timeIndex: 6, gender });
        const adv = MY.recommendOutfit({
          favorableWuxing: favArr, unfavorableWuxing: unfArr,
          dayGan: day.pillars.day.gan, dayZhi: day.pillars.day.zhi, dayMasterGan,
        });
        const p = profile.get();
        const isSelf = !!p && p.date === this.data.date && p.ti === this.data.ti && p.gi === this.data.gi;
        this._fav = favArr;
        this._unf = unfArr;
        this._runKey = `${this.data.date}|${this.data.ti}|${this.data.gi}|${today()}`;
        const paint = (ns, k) => (ns || []).slice(0, k || 4).map((n) => ({ n, c: hexOf(n) }));
        this.setData({ r: null });
        this.setData({
          busy: false, isSelf, showForm: false,
          owned: isSelf ? wardrobe.match(favArr, unfArr) : null,
          r: {
            fav: favArr.join(''), unf: unfArr.join(''),
            dayGz: day.pillars.day.ganZhi,
            main: paint(adv.colors.main, 3), accent: paint(adv.colors.accent, 2), avoid: paint(adv.colors.avoid, 4),
            acc: (adv.accessories || []).slice(0, 6),
            scent: adv.scents.families || [], scentAvoid: adv.scents.avoid || [],
            notes: (adv.notes || []).slice(0, 2),
          },
        }, () => wx.hideLoading());
      } catch (e) {
        wx.hideLoading();
        this.setData({ busy: false });
        wx.showToast({ title: e.message, icon: 'none' });
      }
    }, 80);
  },
});
