const MY = require('../../lib/mingyu.js');
const TIMES = ['早子 00-01', '丑 01-03', '寅 03-05', '卯 05-07', '辰 07-09', '巳 09-11', '午 11-13', '未 13-15', '申 15-17', '酉 17-19', '戌 19-21', '亥 21-23', '晚子 23-24'];

Page({
  data: { date: '1996-11-23', times: TIMES, ti: 2, genders: ['男 (乾造)', '女 (坤造)'], gi: 0, natal: '', best: '', worst: '' },
  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ ti: +e.detail.value }); },
  onGender(e) { this.setData({ gi: +e.detail.value }); },
  run() {
    const [y, m, d] = this.data.date.split('-').map(Number);
    let k;
    try {
      k = MY.calculateLifeKline(
        { year: y, month: m, day: d, timeIndex: this.data.ti, gender: this.data.gi === 0 ? 'male' : 'female', strengthModel: 'classic-calibrated' },
        { startAge: 18, endAge: 70 },
      );
    } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); return; }
    const ys = k.years;
    const sorted = [...ys].sort((a, b) => b.score - a.score);
    this.setData({
      natal: `${k.natal.pillars} · 喜${k.natal.favorableWuxing.join('')}忌${k.natal.unfavorableWuxing.join('')}`,
      best: sorted.slice(0, 2).map((x) => `${x.year}${x.liunianGanZhi} ${x.score}`).join(' / '),
      worst: sorted.slice(-2).map((x) => `${x.year}${x.liunianGanZhi} ${x.score}`).join(' / '),
    }, () => this.draw(ys));
  },
  draw(ys) {
    wx.createSelectorQuery().select('#kc').fields({ node: true, size: true }).exec((res) => {
      const { node: canvas, width, height } = res[0];
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr; canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#1e1a14'; ctx.fillRect(0, 0, width, height);
      const padL = 26, padB = 22, padT = 8;
      const xw = (width - padL - 8) / ys.length;
      const yOf = (v) => padT + ((98 - v) / 96) * (height - padT - padB);
      ctx.strokeStyle = '#342d22'; ctx.fillStyle = '#9c917c'; ctx.font = '9px sans-serif';
      for (const g of [20, 50, 80]) {
        ctx.beginPath(); ctx.moveTo(padL, yOf(g)); ctx.lineTo(width - 8, yOf(g)); ctx.stroke();
        ctx.fillText(String(g), 4, yOf(g) + 3);
      }
      ys.forEach((yr, i) => {
        const x = padL + i * xw + xw / 2;
        const up = yr.close >= yr.open;
        const col = up ? '#d1553f' : '#4ea08f';
        ctx.strokeStyle = col; ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x, yOf(yr.high)); ctx.lineTo(x, yOf(yr.low)); ctx.stroke();
        const top = yOf(Math.max(yr.open, yr.close));
        const h = Math.max(1.5, Math.abs(yOf(yr.open) - yOf(yr.close)));
        if (up) ctx.fillRect(x - xw * 0.3, top, xw * 0.6, h);
        else ctx.strokeRect(x - xw * 0.3, top, xw * 0.6, h);
        if (i % 8 === 0) { ctx.fillStyle = '#9c917c'; ctx.fillText(String(yr.year), x - 14, height - 8); }
      });
    });
  },
});
