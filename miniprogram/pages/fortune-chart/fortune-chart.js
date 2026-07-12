const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const klineCache = require('../../utils/kline-cache.js');
const daily = require('../../utils/daily-fortune.js');
const reading = require('../../utils/kline-reading.js');

const BAND_COLOR = { 旺: '#b5432f', 順: '#c96f2f', 平: '#8a8272', 緩: '#3f7050', 守: '#2f5540' };
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const bandOf = (s) => (s >= 68 ? '旺' : s >= 56 ? '順' : s >= 44 ? '平' : s >= 32 ? '緩' : '守');

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
    this.setData({ selMonth: null });
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
    const band = yr.score >= 67 ? '佳' : yr.score >= 45 ? '平' : '緩';
    this.setData({
      sel: {
        kind: 'year', title: `${yr.year} ${yr.liunianGanZhi}年 · ${yr.age}岁`, score: Math.round(yr.score),
        band, color: yr.score >= 67 ? '#b5432f' : yr.score >= 45 ? '#8a8272' : '#3f7050',
        isToday: yr.year === new Date().getFullYear(),
        text: r.text,
        range: `高 ${Math.round(yr.high)} · 低 ${Math.round(yr.low)}`,
        dayun: yr.dayunGanZhi ? `大运 ${yr.dayunGanZhi}` : '',
      },
    }, () => {
      // 流月:今年默认选中当前月,其他年份选首月
      const now = new Date();
      this.selectMonth(yr.year === now.getFullYear() ? now.getMonth() : 0);
    });
    this.paintYears(i);
  },
  onMonthTouch(e) {
    const yr = this.k.years[this._i];
    if (!yr || this._m !== 'year' || !this.mcv) return;
    const x = e.touches[0].x;
    const i = Math.max(0, Math.min(11, Math.floor((x / this.mcv.width) * 12)));
    this.selectMonth(i);
  },
  selectMonth(mi) {
    const yr = this.k.years[this._i];
    if (!yr || !(yr.monthScores || []).length) return;
    const s = yr.monthScores[mi];
    const band = bandOf(s);
    let gz = '';
    try {
      const lm = MY.baziCalculator.calculateLiuyue(yr.year, mi + 1, this.k.natal.dayMaster);
      gz = lm.ganZhi || `${lm.gan || ''}${lm.zhi || ''}`;
    } catch (e) { /* 流月干支拿不到就只显示分数 */ }
    let why = '';
    if (gz && gz.length >= 2) {
      const fav = this.k.natal.favorableWuxing || [];
      const unf = this.k.natal.unfavorableWuxing || [];
      const hits = [GAN_WX[gz[0]], ZHI_WX[gz[1]]];
      const f = hits.filter((w) => fav.indexOf(w) > -1).length;
      const u = hits.filter((w) => unf.indexOf(w) > -1).length;
      why = f && !u ? '月令带喜用,宜推进' : u && !f ? '月令带忌神,宜稳守' : f && u ? '喜忌相杂,顺势而为' : '月令中性,照常即可';
    }
    this.setData({
      selMonth: {
        title: `第${mi + 1}个月(节气月)${gz ? ' · ' + gz : ''}`,
        score: Math.round(s), band, color: BAND_COLOR[band], text: why,
      },
    });
    this.drawMonths(yr, mi);
  },
  drawMonths(yr, selIdx) {
    const paint = () => {
      const { ctx, width, height } = this.mcv;
      const ms = yr.monthScores;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, width, height);
      const lo = Math.min(...ms) - 4, hi = Math.max(...ms) + 4, span = Math.max(1, hi - lo);
      const bw = width / 12;
      ms.forEach((s, i) => {
        const h = ((s - lo) / span) * (height - 26);
        ctx.fillStyle = BAND_COLOR[bandOf(s)];
        ctx.globalAlpha = i === selIdx ? 1 : 0.45;
        const w = bw * 0.5;
        const x = i * bw + (bw - w) / 2;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, height - 20 - h, w, h, w / 2); ctx.fill(); }
        else ctx.fillRect(x, height - 20 - h, w, h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = i === selIdx ? '#33302a' : '#8a8272';
        ctx.font = '9px sans-serif';
        ctx.fillText(String(i + 1), i * bw + bw / 2 - 3, height - 6);
      });
    };
    if (this.mcv) { paint(); return; }
    wx.createSelectorQuery().select('#mc').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const { node: canvas, width, height } = res[0];
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio;
      canvas.width = width * dpr; canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      this.mcv = { ctx, width, height };
      paint();
    });
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
  onShareAppMessage() { return { title: '今日宜忌,看一眼再出门', path: '/pages/fortune/fortune' }; },
});
