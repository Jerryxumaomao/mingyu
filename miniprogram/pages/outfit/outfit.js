const MY = require('../../lib/mingyu.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

Page({
  data: { date: '1996-11-23', times: TIMES, ti: 2, genders: ['男 (乾造)', '女 (坤造)'], gi: 0, target: today(), r: null },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  onTarget(e) { this.setData({ target: e.detail.value }); },
  run() {
    const [y, m, d] = this.data.date.split('-').map(Number);
    const [ty, tm, td] = this.data.target.split('-').map(Number);
    const gender = this.data.gi === 0 ? 'male' : 'female';
    try {
      const chart = MY.baziCalculator.calculateBazi({ year: y, month: m, day: d, timeIndex: this.data.ti, gender, strengthModel: 'classic-calibrated' });
      const day = MY.baziCalculator.calculatePillars({ year: ty, month: tm, day: td, timeIndex: 6, gender });
      const ug = chart.analysis.usefulGod;
      const adv = MY.recommendOutfit({
        favorableWuxing: ug.favorableWuxing || [], unfavorableWuxing: ug.unfavorableWuxing || [],
        dayGan: day.pillars.day.gan, dayZhi: day.pillars.day.zhi, dayMasterGan: chart.dayMaster.gan,
      });
      this.setData({ r: null });
      this.setData({
        r: {
          fav: (ug.favorableWuxing || []).join(''), unf: (ug.unfavorableWuxing || []).join(''),
          dayGz: day.pillars.day.ganZhi,
          main: adv.colors.main.join('、'), accent: adv.colors.accent.join('、'), avoid: adv.colors.avoid.join('、'),
          acc: adv.accessories.join('、'),
          scent: adv.scents.families.join('、'), scentAvoid: adv.scents.avoid.join('、'),
          notes: adv.notes,
        },
      });
    } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); }
  },
});
