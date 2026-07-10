const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');

Page({
  data: { profTitle: '本人档案', profDesc: '设置一次,五个功能自动带入' },
  onShow() {
    const p = profile.get();
    if (!p) {
      this.setData({ profTitle: '本人档案', profDesc: '设置一次,五个功能自动带入' });
      return;
    }
    try {
      const r = MY.baziCalculator.calculatePillars(profile.personFrom(p.date, p.ti, p.gi));
      this.setData({
        profTitle: `我的档案 · ${r.pillars.day.ganZhi}日主`,
        profDesc: `${p.date}${p.lon ? ' · 真太阳时已启用' : ''} · 点击修改`,
      });
    } catch (e) {
      this.setData({ profTitle: '本人档案', profDesc: '档案数据异常,点击重设' });
    }
  },
});
