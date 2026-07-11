const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const wardrobe = require('../../utils/wardrobe.js');
const { hexOf } = require('../../utils/colormap.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

Page({
  data: {
    date: '1996-11-23', times: TIMES, ti: 2, genders: ['男 (乾造)', '女 (坤造)'], gi: 0,
    target: today(), r: null, busy: false, showForm: false, isSelf: true, owned: null,
  },
  onLoad() {
    const p = profile.get();
    if (p) this.setData({ date: p.date, ti: p.ti, gi: p.gi });
  },
  onShow() {
    const p = profile.get();
    if (p && !this.data.r && !this.data.busy) {
      this.setData({ date: p.date, ti: p.ti, gi: p.gi }, () => this.run());
    } else if (this.data.r && this.data.isSelf && this._fav) {
      this.setData({ owned: wardrobe.match(this._fav) });
    }
  },
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
        const chart = MY.baziCalculator.calculateBazi({ ...profile.personFrom(this.data.date, this.data.ti, this.data.gi), strengthModel: 'classic-calibrated' });
        const day = MY.baziCalculator.calculatePillars({ year: ty, month: tm, day: td, timeIndex: 6, gender });
        const ug = chart.analysis.usefulGod;
        const favArr = ug.favorableWuxing || [];
        const adv = MY.recommendOutfit({
          favorableWuxing: favArr, unfavorableWuxing: ug.unfavorableWuxing || [],
          dayGan: day.pillars.day.gan, dayZhi: day.pillars.day.zhi, dayMasterGan: chart.dayMaster.gan,
        });
        const p = profile.get();
        const isSelf = !!p && p.date === this.data.date && p.ti === this.data.ti && p.gi === this.data.gi;
        this._fav = favArr;
        const paint = (ns, k) => (ns || []).slice(0, k || 4).map((n) => ({ n, c: hexOf(n) }));
        this.setData({ r: null });
        this.setData({
          busy: false, isSelf, showForm: false,
          owned: isSelf ? wardrobe.match(favArr) : null,
          r: {
            fav: favArr.join(''), unf: (ug.unfavorableWuxing || []).join(''),
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
