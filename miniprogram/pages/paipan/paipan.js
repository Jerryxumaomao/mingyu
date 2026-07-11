const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];

Page({
  data: {
    date: '1996-11-23', times: TIMES, ti: 2, genders: ['男 (乾造)', '女 (坤造)'], gi: 0,
    r: null, busy: false, showForm: false, isSelf: true,
  },
  onLoad() {
    const p = profile.get();
    if (p) this.setData({ date: p.date, ti: p.ti, gi: p.gi });
  },
  onShow() {
    // 有档案且尚无结果:自动按档案排盘
    const p = profile.get();
    if (p && !this.data.r && !this.data.busy) {
      this.setData({ date: p.date, ti: p.ti, gi: p.gi }, () => this.run());
    }
  },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  run() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    wx.showLoading({ title: '正在排盘', mask: true });
    setTimeout(() => {
      try {
        const r = MY.baziCalculator.calculateBazi({
          ...profile.personFrom(this.data.date, this.data.ti, this.data.gi),
          strengthModel: 'classic-calibrated',
        });
        const ug = r.analysis.usefulGod;
        const p = profile.get();
        const isSelf = !!p && p.date === this.data.date && p.ti === this.data.ti && p.gi === this.data.gi;
        this.setData({ r: null });
        this.setData({
          busy: false, isSelf, showForm: false,
          r: {
            zhus: [
              { n: '年', gz: r.pillars.year.ganZhi }, { n: '月', gz: r.pillars.month.ganZhi },
              { n: '日', gz: r.pillars.day.ganZhi }, { n: '时', gz: r.pillars.hour.ganZhi },
            ],
            dm: r.dayMaster.gan + r.dayMaster.element,
            status: r.analysis.dayMasterStrength.status,
            score: r.analysis.dayMasterStrength.score,
            fav: (ug.favorableWuxing || []).join(''),
            unf: (ug.unfavorableWuxing || []).join(''),
            warnings: r.warnings || [],
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
