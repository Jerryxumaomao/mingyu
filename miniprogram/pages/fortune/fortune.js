const profile = require('../../utils/profile.js');
const klineCache = require('../../utils/kline-cache.js');
const daily = require('../../utils/daily-fortune.js');
const { WX_COLOR } = require('../../utils/colormap.js');

const BAND_COLOR = { 大吉: '#b5432f', 吉: '#c96f2f', 平: '#8a8272', 凶: '#3f7050', 大凶: '#2f5540' };

Page({
  data: {
    hasProfile: false, today: null, bandColor: '#8a8272',
    yearNote: null, colors: null,
  },
  onShow() {
    const p = profile.get();
    if (!p) { this.setData({ hasProfile: false, today: null }); return; }
    this.person = p;
    const cached = klineCache.get(p.date, p.ti, p.gi);
    if (cached) { this.render(cached); return; }
    wx.showLoading({ title: '正在起盘', mask: true });
    setTimeout(() => {
      try {
        const k = klineCache.build(p.date, p.ti, p.gi);
        klineCache.save(k);
        wx.hideLoading();
        this.render(k);
      } catch (e) { wx.hideLoading(); wx.showToast({ title: e.message, icon: 'none' }); }
    }, 80);
  },
  render(k) {
    const today = daily.score(new Date(), k.natal);
    // 今日五行:流日干支落在哪两行,与命局喜忌的关系
    const fav = k.natal.favorableWuxing || [];
    const unf = k.natal.unfavorableWuxing || [];
    const wx5 = ['木', '火', '土', '金', '水'].map((w) => {
      const day = today.gwx === w || today.zwx === w;
      const tag = day ? (fav.indexOf(w) > -1 ? '当值·喜' : unf.indexOf(w) > -1 ? '当值·忌' : '当值')
        : (fav.indexOf(w) > -1 ? '喜' : unf.indexOf(w) > -1 ? '忌' : '·');
      return { w, c: WX_COLOR[w], day, tag };
    });
    const dayEls = today.gwx === today.zwx ? today.gwx : `${today.gwx}、${today.zwx}`;
    const favDay = [today.gwx, today.zwx].some((w) => fav.indexOf(w) > -1);
    const unfDay = [today.gwx, today.zwx].some((w) => unf.indexOf(w) > -1);
    const wxLine = `今日${dayEls}当值,${favDay && !unfDay ? '正合你的喜用,诸事可为' : unfDay && !favDay ? '与你的命局相耗,宜守不宜攻' : favDay ? '喜忌相杂,顺势而为' : '不喜不忌,平常心行事'}。`;
    // 今日开运色:直接吃首页仪表盘缓存(首页每天会算)
    let colors = null;
    try {
      const c = wx.getStorageSync('wz-dash');
      if (c && c.dash && c.dash.main) colors = { main: c.dash.main, accent: c.dash.accent || [] };
    } catch (e) { /* 没有就不显示 */ }
    const qi = { 大吉: 0, 吉: 1, 平: 2, 凶: 3, 大凶: 4 }[today.band];
    this.setData({ hasProfile: true, today, qi, bandColor: BAND_COLOR[today.band], wx5, wxLine, colors },
      () => this.drawThumbs(k));
  },
  drawThumbs(k) {
    const seven = daily.series(k.natal, 0, 6).map((x) => x.score);
    this.sparkline('#dthumb', seven, true);
    this.sparkline('#ythumb', (k.years || []).map((y) => y.score), false);
  },
  sparkline(sel, vals, dots) {
    wx.createSelectorQuery().select(sel).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !vals.length) return;
      const { node: canvas, width, height } = res[0];
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio;
      canvas.width = width * dpr; canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo);
      const x = (i) => 6 + (i / (vals.length - 1)) * (width - 12);
      const y = (v) => height - 8 - ((v - lo) / span) * (height - 16);
      ctx.strokeStyle = '#b5432f'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      vals.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
      ctx.stroke();
      if (dots) {
        ctx.fillStyle = '#b5432f';
        vals.forEach((v, i) => { ctx.beginPath(); ctx.arc(x(i), y(v), i === 0 ? 3.5 : 2, 0, Math.PI * 2); ctx.fill(); });
      }
    });
  },
  goDay() { wx.navigateTo({ url: '/pages/fortune-chart/fortune-chart?mode=day' }); },
  goYear() { wx.navigateTo({ url: '/pages/fortune-chart/fortune-chart?mode=year' }); },
  goOutfit() { wx.switchTab({ url: '/pages/outfit/outfit' }); },
});
