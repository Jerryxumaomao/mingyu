const MY = require('../../lib/mingyu.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];
const toPerson = (s) => {
  const [y, m, d] = s.date.split('-').map(Number);
  return { year: y, month: m, day: d, timeIndex: s.ti, gender: s.gi === 0 ? 'male' : 'female' };
};

Page({
  data: {
    times: TIMES, genders: ['男 (乾造)', '女 (坤造)'],
    a: { date: '1996-11-23', ti: 2, gi: 0 },
    b: { date: '1996-08-20', ti: 7, gi: 1 },
    r: null,
  },
  onA(e) { this.pick('a', e); },
  onB(e) { this.pick('b', e); },
  pick(side, e) {
    const k = e.currentTarget.dataset.k;
    const v = e.detail.value;
    this.setData({ [`${side}.${k || 'date'}`]: k ? +v : v });
  },
  run() {
    try {
      const h = MY.calculateHehun(toPerson(this.data.a), toPerson(this.data.b));
      this.setData({ r: { total: h.total, grade: h.grade, rules: h.rules, ap: h.a.pillars, bp: h.b.pillars } });
    } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); }
  },
});
