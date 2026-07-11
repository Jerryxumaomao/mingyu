const profile = require('../../utils/profile.js');
const klineCache = require('../../utils/kline-cache.js');
const daily = require('../../utils/daily-fortune.js');
const reading = require('../../utils/kline-reading.js');

const BAND_COLOR = { 大吉: '#b5432f', 吉: '#c96f2f', 平: '#8a8272', 凶: '#3f7050', 大凶: '#2f5540' };

Page({
  data: { mode: 'day', sel: null, natalStr: '', ready: false },
  onLoad(q) {
    const p = profile.get();
    this.person = {
      date: q.date || (p && p.date) || '1996-11-23',
      ti: q.ti !== undefined ? +q.ti : (p ? p.ti : 2),
      gi: q.gi !== undefined ? +q.gi : (p ? p.gi : 0),
    };
    this.setData({ mode: q.mode === 'year' ? 'year' : 'day' });
    wx.showLoading({ title: '正在铺图', mask: true });
    setTimeout(() => this.prepare(), 80);
  },
  prepare() {
    try {
      const { date, ti, gi } = this.person;
      let k = klineCache.get(date, ti, gi);
      if (!k) { k = klineCache.build(date, ti, gi); klineCache.save(k); }
      this.k = k;
      this.days = daily.series(k.natal, -15, 15); // 前后各15天
      this.setData({
        ready: true,
        natalStr: `${k.natal.pillars} · 喜${k.natal.favorableWuxing.join('')}忌${k.natal.unfavorableWuxing.join('')}`,
      }, () => this.initCanvas());
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },
  initCanvas() {
    wx.createSelectorQuery().select('#fc').fields({ node: true, size: true }).exec((res) => {
      const { node: canvas, width, height } = res[0];
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio;
      canvas.width = width * dpr; canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      this.cv = { ctx, width, height };
      wx.hideLoading();
      this.selectDefault();
    });
  },
  switchMode(e) {
    const mode = e.currentTarget.dataset.m;
    if (mode === this.data.mode) return;
    this.setData({ mode }, () => this.selectDefault());
  },
  selectDefault() {
    if (this.data.mode === 'day') {
      this.selectDay(15); // 正中=今天
    } else {
      const cur = new Date().getFullYear();
      const idx = Math.max(0, this.k.years.findIndex((y) => y.year === cur));
      this.selectYear(idx);
    }
  },
  onTouch(e) {
    if (!this.cv) return;
    const x = e.touches[0].x;
    const n = this.data.mode === 'day' ? this.days.length : this.k.years.length;
    const { padL, xw } = this.geom(n);
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - padL) / xw)));
    if (this.data.mode === 'day') this.selectDay(i);
    else this.selectYear(i);
  },
  selectDay(i) {
    if (this._m === 'day' && this._i === i) return;
    this._m = 'day'; this._i = i;
    const d = this.days[i];
    this.setData({
      sel: {
        kind: 'day', title: `${d.iso} · ${d.gz}日`, score: d.score, band: d.band,
        color: BAND_COLOR[d.band], isToday: d.offset === 0,
        yi: d.yi.join(' · '), ji: d.ji.join(' · '),
        note: d.notes.join(';') || '',
      },
    });
    this.paintDays(i);
  },
  selectYear(i) {
    if (this._m === 'year' && this._i === i) return;
    this._m = 'year'; this._i = i;
    const ys = this.k.years;
    const yr = ys[i];
    const r = reading.yearText(yr, this.k.natal, i > 0 ? ys[i - 1] : null);
    const band = yr.score >= 67 ? '吉' : yr.score >= 45 ? '平' : '凶';
    this.setData({
      sel: {
        kind: 'year', title: `${yr.year} ${yr.liunianGanZhi}年 · ${yr.age}岁`, score: Math.round(yr.score),
        band, color: yr.score >= 67 ? '#b5432f' : yr.score >= 45 ? '#8a8272' : '#3f7050',
        isToday: yr.year === new Date().getFullYear(),
        text: r.text,
        range: `高 ${Math.round(yr.high)} · 低 ${Math.round(yr.low)}`,
        dayun: yr.dayunGanZhi ? `大运 ${yr.dayunGanZhi}` : '',
      },
    });
    this.paintYears(i);
  },
  geom(n) {
    const padL = 36;
    const xw = (this.cv.width - padL - 12) / n;
    return { padL, xw };
  },
  axis(yOf) {
    const { ctx, width } = this.cv;
    ctx.strokeStyle = '#e6dcc6'; ctx.fillStyle = '#8a8272'; ctx.font = '10px sans-serif';
    for (const g of [20, 50, 80]) {
      ctx.beginPath(); ctx.moveTo(36, yOf(g)); ctx.lineTo(width - 12, yOf(g)); ctx.stroke();
      ctx.fillText(String(g), 6, yOf(g) + 4);
    }
  },
  paintDays(selIdx) {
    const { ctx, width, height } = this.cv;
    const ds = this.days;
    const { padL, xw } = this.geom(ds.length);
    const yOf = (v) => 10 + ((98 - v) / 96) * (height - 10 - 26);
    ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, width, height);
    this.axis(yOf);
    // 折线
    ctx.strokeStyle = '#b5432f'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    ds.forEach((d, i) => { const x = padL + i * xw + xw / 2; i ? ctx.lineTo(x, yOf(d.score)) : ctx.moveTo(x, yOf(d.score)); });
    ctx.stroke();
    ds.forEach((d, i) => {
      const x = padL + i * xw + xw / 2;
      ctx.fillStyle = d.offset === 0 ? '#33302a' : BAND_COLOR[d.band];
      ctx.beginPath(); ctx.arc(x, yOf(d.score), i === selIdx ? 5 : (d.offset === 0 ? 3.5 : 2.2), 0, Math.PI * 2); ctx.fill();
      if (i % 5 === 0) { ctx.fillStyle = '#8a8272'; ctx.font = '9px sans-serif'; ctx.fillText(d.date, x - 14, height - 8); }
    });
    // 选中竖线
    const sx = padL + selIdx * xw + xw / 2;
    ctx.strokeStyle = 'rgba(51,48,42,.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(sx, 8); ctx.lineTo(sx, height - 24); ctx.stroke();
    ctx.setLineDash([]);
  },
  paintYears(selIdx) {
    const { ctx, width, height } = this.cv;
    const ys = this.k.years;
    const { padL, xw } = this.geom(ys.length);
    const yOf = (v) => 10 + ((98 - v) / 96) * (height - 10 - 26);
    ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, width, height);
    this.axis(yOf);
    ys.forEach((yr, i) => {
      const x = padL + i * xw + xw / 2;
      const up = yr.close >= yr.open;
      const col = up ? '#b5432f' : '#3f7050';
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, yOf(yr.high)); ctx.lineTo(x, yOf(yr.low)); ctx.stroke();
      const top = yOf(Math.max(yr.open, yr.close));
      const h = Math.max(1.5, Math.abs(yOf(yr.open) - yOf(yr.close)));
      if (up) ctx.fillRect(x - xw * 0.3, top, xw * 0.6, h);
      else ctx.strokeRect(x - xw * 0.3, top, xw * 0.6, h);
      if (i % 8 === 0) { ctx.fillStyle = '#8a8272'; ctx.font = '9px sans-serif'; ctx.fillText(String(yr.year), x - 13, height - 8); }
    });
    const sx = padL + selIdx * xw + xw / 2;
    ctx.strokeStyle = 'rgba(51,48,42,.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(sx, 8); ctx.lineTo(sx, height - 24); ctx.stroke();
    ctx.setLineDash([]);
  },
  goBig() {
    const { date, ti, gi } = this.person;
    wx.navigateTo({ url: `/pages/kchart/kchart?date=${date}&ti=${ti}&gi=${gi}` });
  },
});
