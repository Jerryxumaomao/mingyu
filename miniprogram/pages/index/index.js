const almanac = require('../../utils/today-almanac.js');

Page({
  data: {
    splash: false, splashFade: false,
    today: null, zodiacs: null,
  },
  onLoad() {
    const app = getApp();
    if (!app.globalData.splashDone) {
      app.globalData.splashDone = true;
      this.setData({ splash: true });
      wx.hideTabBar({ animation: false, fail: () => {} });
      this._splashTimer = setTimeout(() => this.endSplash(), 1600);
      this._splashGuard = setTimeout(() => this.endSplash(), 4000);
    }
  },
  skipSplash() { this.endSplash(); },
  onSplashError() { this.endSplash(); },
  endSplash() {
    clearTimeout(this._splashTimer);
    clearTimeout(this._splashGuard);
    if (this._splashEnded) return;
    this._splashEnded = true;
    this.setData({ splashFade: true });
    setTimeout(() => { this.setData({ splash: false }); this.restoreTab(); }, 400);
    setTimeout(() => { this.setData({ splash: false }); this.restoreTab(); }, 1200);
  },
  restoreTab() {
    wx.showTabBar({ animation: false, fail: () => setTimeout(() => wx.showTabBar({ animation: false, fail: () => {} }), 800) });
  },
  onShow() {
    // 全部基于"今天",无任何个人信息;同一天只算一次
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (this._key === key && this.data.today) return;
    try {
      const today = almanac.overview();
      const zs = almanac.zodiacs(today.dayZhi).slice(0, 4); // 首页预览前四个
      this._key = key;
      this.setData({ today, zodiacs: zs });
    } catch (e) { /* 引擎异常则页面留白,不影响其他 tab */ }
  },
  goOutfit() { wx.switchTab({ url: '/pages/outfit/outfit' }); },
  goZodiac() { wx.switchTab({ url: '/pages/zodiac/zodiac' }); },
  goWardrobe() { wx.navigateTo({ url: '/pages/wardrobe/wardrobe' }); },
  onShareAppMessage() { return { title: '今日五行色,今天穿什么 · 玩占', path: '/pages/index/index' }; },
  onShareTimeline() { return { title: '今日五行色,今天穿什么 · 玩占' }; },
});
