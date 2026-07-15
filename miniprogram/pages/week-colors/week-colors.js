const MY = require('../../lib/mingyu.js');
const { hexOf } = require('../../utils/colormap.js');
const { dayPalette } = require('../../utils/today-almanac.js');

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: { days: null },
  onLoad() {
    wx.showLoading({ title: '正在铺色', mask: true });
    setTimeout(() => this.build(), 60);
  },
  build() {
    try {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const p = MY.baziCalculator.calculatePillars({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), timeIndex: 6, gender: 'male' });
        const { el, lucky, avoid } = dayPalette(p.pillars.day.ganZhi);
        const adv = MY.recommendOutfit({ favorableWuxing: [lucky, el], unfavorableWuxing: [avoid], dayGan: p.pillars.day.gan, dayZhi: p.pillars.day.zhi, dayMasterGan: p.pillars.day.gan });
        const main = (adv.colors.main || []).slice(0, 3).map((n) => ({ n, c: hexOf(n) }));
        const accent = (adv.colors.accent || []).slice(0, 2).map((n) => ({ n, c: hexOf(n) }));
        days.push({
          label: i === 0 ? '今天' : i === 1 ? '明天' : `周${WEEK[d.getDay()]}`,
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          el, main, accent,
          name: main.length ? main[0].n : '',
          today: i === 0,
        });
      }
      this.setData({ days }, () => wx.hideLoading());
    } catch (e) { wx.hideLoading(); }
  },
  onShareAppMessage() { return { title: '未来一周每日色卡,提前配好', path: '/pages/week-colors/week-colors' }; },
});
