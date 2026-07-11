const klineCache = require('./utils/kline-cache.js');

App({
  globalData: { splashDone: false },
  onLaunch() {
    // 开屏展示期间后台预算全程K线,用户点开"年运"时秒开
    setTimeout(() => klineCache.preload(), 1200);
  },
});
