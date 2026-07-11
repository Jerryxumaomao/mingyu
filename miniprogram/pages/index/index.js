const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');

Page({
  data: { pillars: null, profDesc: '设置一次本人档案,四柱常驻首页,五个功能自动带入' },
  onShow() {
    const p = profile.get();
    if (!p) {
      this.setData({ pillars: null, profDesc: '设置一次本人档案,四柱常驻首页,五个功能自动带入' });
      return;
    }
    try {
      const r = MY.baziCalculator.calculatePillars(profile.personFrom(p.date, p.ti, p.gi));
      const pillars = [['年', r.pillars.year], ['月', r.pillars.month], ['日', r.pillars.day], ['时', r.pillars.hour]]
        .map(([n, x]) => ({ n, g: x.ganZhi[0], z: x.ganZhi[1], day: n === '日' }));
      this.setData({
        pillars,
        profDesc: `${p.date}${p.lon ? ' · 真太阳时' : ''} · 点击修改档案`,
      });
    } catch (e) {
      this.setData({ pillars: null, profDesc: '档案数据异常,点击重设' });
    }
  },
});
