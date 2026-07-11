const MY = require('../../lib/mingyu.js');
const profile = require('../../utils/profile.js');
const klineCache = require('../../utils/kline-cache.js');

const { WX_COLOR, hexOf } = require('../../utils/colormap.js');
const { GAN_WX, ZHI_WX } = require('../../utils/daily-fortune.js');

Page({
  data: {
    padTop: 40, splash: false, splashFade: false,
    pillars: null, profDesc: '设置一次本人档案,四柱常驻首页,五个功能自动带入',
    dash: null,
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ padTop: (info.statusBarHeight || 32) + 10 });
    const app = getApp();
    if (!app.globalData.splashDone) {
      app.globalData.splashDone = true;
      this.setData({ splash: true });
      wx.hideTabBar({ animation: false });
      this._splashTimer = setTimeout(() => this.endSplash(), 1600);
    }
  },
  skipSplash() { clearTimeout(this._splashTimer); this.endSplash(); },
  endSplash() {
    if (!this.data.splash || this.data.splashFade) return;
    this.setData({ splashFade: true });
    setTimeout(() => { this.setData({ splash: false }); wx.showTabBar({ animation: true }); }, 400);
  },
  onShow() {
    const p = profile.get();
    if (!p) {
      this.setData({ pillars: null, dash: null, profDesc: '设置一次本人档案,四柱常驻首页,五个功能自动带入' });
      return;
    }
    try {
      const r = MY.baziCalculator.calculatePillars(profile.personFrom(p.date, p.ti, p.gi));
      const pillars = [['年', r.pillars.year], ['月', r.pillars.month], ['日', r.pillars.day], ['时', r.pillars.hour]]
        .map(([n, x]) => ({ n, g: x.ganZhi[0], z: x.ganZhi[1], day: n === '日' }));
      this.setData({ pillars, profDesc: `${p.date}${p.lon ? ' · 真太阳时' : ''} · 点击修改档案` });
    } catch (e) {
      this.setData({ pillars: null, profDesc: '档案数据异常,点击重设' });
    }
    // 仪表盘:同一档案同一天只算一次(内存 + 本地缓存两级)
    const d = new Date();
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const key = `${p.date}|${p.ti}|${p.gi}|${today}|v2`; // v2:dash 增加 wx5/色名括注字段
    if (this._dashKey === key && this.data.dash) return;
    try {
      const c = wx.getStorageSync('wz-dash');
      if (c && c.key === key) { this._dashKey = key; this.setData({ dash: c.dash }); return; }
    } catch (e) { /* 缓存不可用则现算 */ }
    setTimeout(() => this.computeDash(p, key), 60);
  },
  computeDash(p, key) {
    try {
      const person = { ...profile.personFrom(p.date, p.ti, p.gi), strengthModel: 'classic-calibrated' };
      const chart = MY.baziCalculator.calculateBazi(person);
      const ug = chart.analysis.usefulGod;
      const fav = ug.favorableWuxing || [];
      const unf = ug.unfavorableWuxing || [];
      const now = new Date();
      const [ty, tm, td] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
      const day = MY.baziCalculator.calculatePillars({ year: ty, month: tm, day: td, timeIndex: 6, gender: p.gi === 0 ? 'male' : 'female' });
      const adv = MY.recommendOutfit({
        favorableWuxing: fav, unfavorableWuxing: unf,
        dayGan: day.pillars.day.gan, dayZhi: day.pillars.day.zhi, dayMasterGan: chart.dayMaster.gan,
      });
      // 今年运势:优先吃启动预载的全程缓存;未命中才算当年附近的窄窗
      const cached = klineCache.get(p.date, p.ti, p.gi);
      let yr = cached ? (cached.years || []).find((y) => y.year === ty) : null;
      if (!yr) {
        const age = ty - Number(p.date.split('-')[0]);
        const k = MY.calculateLifeKline(person, { startAge: Math.max(1, age - 1), endAge: age + 2 });
        yr = (k.years || []).find((y) => y.year === ty);
      }
      this._dashKey = key;
      // 今日五行:流日干支落在哪两行,与命局喜忌的关系
      const gwx = GAN_WX[day.pillars.day.gan];
      const zwx = ZHI_WX[day.pillars.day.zhi];
      const wx5 = ['木', '火', '土', '金', '水'].map((w) => {
        const onDay = gwx === w || zwx === w;
        const tag = onDay ? (fav.indexOf(w) > -1 ? '当值·喜' : unf.indexOf(w) > -1 ? '当值·忌' : '当值')
          : (fav.indexOf(w) > -1 ? '喜' : unf.indexOf(w) > -1 ? '忌' : '·');
        return { w, c: WX_COLOR[w], day: onDay, tag };
      });
      const dayEls = gwx === zwx ? gwx : `${gwx}、${zwx}`;
      const favDay = [gwx, zwx].some((w) => fav.indexOf(w) > -1);
      const unfDay = [gwx, zwx].some((w) => unf.indexOf(w) > -1);
      const wxLine = `今日${dayEls}当值,${favDay && !unfDay ? '正合你的喜用,诸事可为' : unfDay && !favDay ? '与你的命局相耗,宜守不宜攻' : favDay ? '喜忌相杂,顺势而为' : '不喜不忌,平常心行事'}。`;
      const alt = (arr) => (arr.length > 1 ? `${arr[0].n}(${arr.slice(1).map((x) => x.n).join('、')})` : (arr[0] ? arr[0].n : ''));
      const main = (adv.colors.main || []).slice(0, 3).map((n) => ({ n, c: hexOf(n) }));
      const accent = (adv.colors.accent || []).slice(0, 2).map((n) => ({ n, c: hexOf(n) }));
      const dash = {
        strength: chart.analysis.dayMasterStrength.status,
        fav: fav.map((w) => ({ w, c: WX_COLOR[w] || '#8a8272' })),
        unf: unf.map((w) => ({ w, c: WX_COLOR[w] || '#8a8272' })),
        dayGz: day.pillars.day.ganZhi,
        wx5, wxLine,
        main, accent, mainTxt: alt(main), accentTxt: alt(accent),
        year: yr ? {
          y: ty, gz: yr.liunianGanZhi, score: Math.round(yr.score),
          lv: yr.score >= 67 ? '高走' : yr.score >= 45 ? '平稳' : '低回',
        } : null,
      };
      this.setData({ dash });
      try { wx.setStorageSync('wz-dash', { key, dash }); } catch (e) { /* 存不进就每次现算 */ }
    } catch (e) {
      this.setData({ dash: null });
    }
  },
  goOutfit() { wx.switchTab({ url: '/pages/outfit/outfit' }); },
  goKline() { wx.switchTab({ url: '/pages/fortune/fortune' }); },
  goPaipan() { wx.navigateTo({ url: '/pages/paipan/paipan' }); },
  goHehun() { wx.navigateTo({ url: '/pages/hehun/hehun' }); },
  goLiuren() { wx.navigateTo({ url: '/pages/liuren/liuren' }); },
});
