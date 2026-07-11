const profile = require('../../utils/profile.js');
const klineCache = require('../../utils/kline-cache.js');

Page({
  data: { sel: null, natal: '', ready: false },
  onLoad(q) {
    const p = profile.get();
    this.person = {
      date: q.date || (p && p.date) || '1996-11-23',
      ti: q.ti !== undefined ? +q.ti : (p ? p.ti : 2),
      gi: q.gi !== undefined ? +q.gi : (p ? p.gi : 0),
    };
    wx.showLoading({ title: '正在铺开全程', mask: true });
    setTimeout(() => this.compute(), 80);
  },
  compute() {
    try {
      const { date, ti, gi } = this.person;
      let k = klineCache.get(date, ti, gi);
      if (!k) { k = klineCache.build(date, ti, gi); klineCache.save(k); }
      this.ys = k.years;
      this.setData({
        ready: true,
        natal: `${k.natal.pillars} · 喜${k.natal.favorableWuxing.join('')}忌${k.natal.unfavorableWuxing.join('')}`,
      }, () => this.initCanvas());
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },
  initCanvas() {
    wx.createSelectorQuery().select('#kbig').fields({ node: true, size: true }).exec((res) => {
      const { node: canvas, width, height } = res[0];
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio;
      canvas.width = width * dpr; canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      this.cv = { ctx, width, height };
      wx.hideLoading();
      this.paint();
    });
  },
  onTouch(e) {
    if (!this.cv || !this.ys) return;
    const x = e.touches[0].x;
    const { padL, xw } = this.geom();
    const i = Math.max(0, Math.min(this.ys.length - 1, Math.floor((x - padL) / xw)));
    const yr = this.ys[i];
    if (this.data.sel && this.data.sel.year === yr.year) return;
    this.setData({
      sel: {
        year: yr.year, gz: yr.liunianGanZhi, age: yr.age,
        score: Math.round(yr.score * 10) / 10,
        high: Math.round(yr.high * 10) / 10, low: Math.round(yr.low * 10) / 10,
        open: Math.round(yr.open * 10) / 10, close: Math.round(yr.close * 10) / 10,
        up: yr.close >= yr.open,
      },
    });
    this.paint(i);
  },
  geom() {
    const padL = 40;
    const xw = (this.cv.width - padL - 14) / this.ys.length;
    return { padL, xw };
  },
  paint(selIdx = -1) {
    const { ctx, width, height } = this.cv;
    const ys = this.ys;
    const { padL, xw } = this.geom();
    const padB = 30, padT = 12;
    const yOf = (v) => padT + ((98 - v) / 96) * (height - padT - padB);
    ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e6dcc6'; ctx.fillStyle = '#8a8272'; ctx.font = '11px sans-serif';
    for (const g of [20, 50, 80]) {
      ctx.beginPath(); ctx.moveTo(padL, yOf(g)); ctx.lineTo(width - 14, yOf(g)); ctx.stroke();
      ctx.fillText(String(g), 8, yOf(g) + 4);
    }
    ys.forEach((yr, i) => {
      const x = padL + i * xw + xw / 2;
      const up = yr.close >= yr.open;
      const col = up ? '#b5432f' : '#3f7050';
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, yOf(yr.high)); ctx.lineTo(x, yOf(yr.low)); ctx.stroke();
      const top = yOf(Math.max(yr.open, yr.close));
      const h = Math.max(2, Math.abs(yOf(yr.open) - yOf(yr.close)));
      if (up) ctx.fillRect(x - xw * 0.32, top, xw * 0.64, h);
      else { ctx.lineWidth = 1.5; ctx.strokeRect(x - xw * 0.32, top, xw * 0.64, h); }
      if (i % 5 === 0) { ctx.fillStyle = '#8a8272'; ctx.fillText(String(yr.year), x - 15, height - 10); }
    });
    if (selIdx >= 0) {
      const yr = ys[selIdx];
      const x = padL + selIdx * xw + xw / 2;
      ctx.strokeStyle = 'rgba(51,48,42,.55)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, height - padB); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(51,48,42,.75)';
      ctx.fillText(String(yr.year), x - 15, padT + 12);
    }
  },
});
