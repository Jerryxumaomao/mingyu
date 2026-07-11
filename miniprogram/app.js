const klineCache = require('./utils/kline-cache.js');

App({
  globalData: { splashDone: false },
  onLaunch() {
    // 等开屏放完(1.6s+0.4s 淡出)再后台预算全程K线:
    // 重计算会占住 JS 线程,放开屏期间跑会把开屏拖长
    setTimeout(() => klineCache.preload(), 2400);
  },
});
