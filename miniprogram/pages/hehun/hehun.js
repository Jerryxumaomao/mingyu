const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];
const toPerson = (s) => {
  const [y, m, d] = s.date.split('-').map(Number);
  return { year: y, month: m, day: d, timeIndex: s.ti, gender: s.gi === 0 ? 'male' : 'female' };
};

Page({
  onLoad() {
    const p = profile.get();
    if (p) this.setData({ 'a.date': p.date, 'a.ti': p.ti, 'a.gi': p.gi, hasProf: true });
  },
  data: {
    times: TIMES, genders: ['男 (乾造)', '女 (坤造)'],
    a: { date: '1996-11-23', ti: 2, gi: 0 },
    b: { date: '1996-08-20', ti: 7, gi: 1 },
    r: null,
  },
  onShareAppMessage() { return { title: '两个人合不合,来试试', path: '/pages/hehun/hehun' }; },
  onA(e) { this.pick('a', e); },
  onB(e) { this.pick('b', e); },
  pick(side, e) {
    const k = e.currentTarget.dataset.k;
    const v = e.detail.value;
    this.setData({ [`${side}.${k || 'date'}`]: k ? +v : v });
  },
  run() {
    try {
      const h = MY.calculateHehun(profile.personFrom(this.data.a.date, this.data.a.ti, this.data.a.gi), toPerson(this.data.b));
      this.setData({ r: null });
      this.setData({
        r: { total: h.total, grade: h.grade, rules: h.rules, ap: h.a.pillars, bp: h.b.pillars },
        shownTotal: 0,
      });
      this.countUp(h.total);
    } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); }
  },
  // 分数从 0 滚动到总分(easeOut,约 700ms)
  countUp(target) {
    if (this._timer) clearInterval(this._timer);
    const t0 = Date.now();
    const DUR = 700;
    this._timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / DUR);
      const ease = 1 - Math.pow(1 - p, 3);
      this.setData({ shownTotal: Math.round(target * ease) });
      if (p >= 1) { clearInterval(this._timer); this._timer = null; }
    }, 33);
  },
  onUnload() { if (this._timer) clearInterval(this._timer); },
});
