const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const klineCache = require('../../utils/kline-cache.js');
const { hexOf } = require('../../utils/colormap.js');
const { GAN_WX, ZHI_WX } = require('../../utils/daily-fortune.js');

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
// 引擎主色只看第一喜用(整周恒定),这里按"当值喜用优先"逐日重排,让一周有变化:
// 当天干支五行若在喜用之列,就提到最前,当天穿它的色系
const dayFav = (fav, gan, zhi) => {
  const pri = [GAN_WX[gan], ZHI_WX[zhi]].filter((w, i, a) => fav.indexOf(w) > -1 && a.indexOf(w) === i);
  return [...pri, ...fav.filter((w) => pri.indexOf(w) === -1)];
};

Page({
  data: { days: null, hasProfile: true },
  onLoad() {
    const p = profile.get();
    if (!p) { this.setData({ hasProfile: false }); return; }
    wx.showLoading({ title: '正在铺色', mask: true });
    setTimeout(() => this.build(p), 60);
  },
  build(p) {
    try {
      // 喜忌/日主走预载缓存,未命中才整盘重算
      const cached = klineCache.get(p.date, p.ti, p.gi);
      let fav, unf, dm;
      if (cached) {
        fav = cached.natal.favorableWuxing || [];
        unf = cached.natal.unfavorableWuxing || [];
        dm = cached.natal.dayMaster;
      } else {
        const chart = MY.baziCalculator.calculateBazi({ ...profile.personFrom(p.date, p.ti, p.gi), strengthModel: 'classic-calibrated' });
        const ug = chart.analysis.usefulGod;
        fav = ug.favorableWuxing || [];
        unf = ug.unfavorableWuxing || [];
        dm = chart.dayMaster.gan;
      }
      const gender = p.gi === 0 ? 'male' : 'female';
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const day = MY.baziCalculator.calculatePillars({
          year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), timeIndex: 6, gender,
        });
        const adv = MY.recommendOutfit({
          favorableWuxing: dayFav(fav, day.pillars.day.gan, day.pillars.day.zhi), unfavorableWuxing: unf,
          dayGan: day.pillars.day.gan, dayZhi: day.pillars.day.zhi, dayMasterGan: dm,
        });
        const main = (adv.colors.main || []).slice(0, 3).map((n) => ({ n, c: hexOf(n) }));
        const accent = (adv.colors.accent || []).slice(0, 2).map((n) => ({ n, c: hexOf(n) }));
        days.push({
          label: i === 0 ? '今天' : i === 1 ? '明天' : `周${WEEK[d.getDay()]}`,
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          gz: day.pillars.day.ganZhi,
          main, accent,
          name: main.length ? main[0].n : '',
          today: i === 0,
        });
      }
      this.setData({ days }, () => wx.hideLoading());
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },
  onShareAppMessage() { return { title: '未来一周的穿搭色,提前配好', path: '/pages/week-colors/week-colors' }; },
});
