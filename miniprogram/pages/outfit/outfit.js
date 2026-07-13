const MY = require('../../lib/mingyu.js');
const wardrobe = require('../../utils/wardrobe.js');
const almanac = require('../../utils/today-almanac.js');
const { hexOf } = require('../../utils/colormap.js');

// 今日之后 N 天的当值五行色(公共黄历,滚动展示,无个人信息)
const WEEK_CH = ['日', '一', '二', '三', '四', '五', '六'];
function weekStrip() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? '今天' : `周${WEEK_CH[d.getDay()]}`;
    try {
      const p = MY.baziCalculator.calculatePillars({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), timeIndex: 6, gender: 'male' });
      const el = almanac.GAN_WX[p.pillars.day.gan];
      const adv = MY.recommendOutfit({ favorableWuxing: [el, almanac.SHENG[el]], unfavorableWuxing: [], dayGan: p.pillars.day.gan, dayZhi: p.pillars.day.zhi, dayMasterGan: p.pillars.day.gan });
      out.push({ c: hexOf((adv.colors.main || [''])[0] || ''), label, today: i === 0 });
    } catch (e) { out.push({ c: '#d8cdb4', label, today: i === 0 }); }
  }
  return out;
}

Page({
  data: { today: null, owned: null, week: null },
  onShow() {
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (this._key === key && this.data.today) {
      this.setData({ owned: wardrobe.match([this.data.today.element], []) }); // 衣橱可能刚改过
      return;
    }
    wx.showLoading({ title: '正在铺色', mask: true });
    setTimeout(() => {
      try {
        const today = almanac.overview();
        this._key = key;
        this.setData({
          today,
          owned: wardrobe.match([today.element], []),
          week: weekStrip(),
        }, () => wx.hideLoading());
      } catch (e) { wx.hideLoading(); }
    }, 60);
  },
  goWardrobe() { wx.navigateTo({ url: '/pages/wardrobe/wardrobe' }); },
  goWeek() { wx.navigateTo({ url: '/pages/week-colors/week-colors' }); },
  onShareAppMessage() { return { title: '今日穿什么颜色,给你配好了', path: '/pages/outfit/outfit' }; },
  onShareTimeline() { return { title: '今日穿什么颜色,给你配好了' }; },
});
