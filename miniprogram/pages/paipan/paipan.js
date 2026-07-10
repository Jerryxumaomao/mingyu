const MY = require('../../lib/mingyu.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];

Page({
  data: { date: '1996-11-23', times: TIMES, ti: 2, genders: ['男 (乾造)', '女 (坤造)'], gi: 0, r: null },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  run() {
    const [y, m, d] = this.data.date.split('-').map(Number);
    try {
      const r = MY.baziCalculator.calculateBazi({
        year: y, month: m, day: d, timeIndex: this.data.ti,
        gender: this.data.gi === 0 ? 'male' : 'female', strengthModel: 'classic-calibrated',
      });
      const ug = r.analysis.usefulGod;
      this.setData({ r: null });
      this.setData({
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
      });
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },
});
