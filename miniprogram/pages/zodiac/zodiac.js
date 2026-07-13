const almanac = require('../../utils/today-almanac.js');

Page({
  data: { today: null, zodiacs: null },
  onShow() {
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (this._key === key && this.data.today) return;
    try {
      const today = almanac.overview();
      this._key = key;
      this.setData({ today, zodiacs: almanac.zodiacs(today.dayZhi) });
    } catch (e) { /* 引擎异常留白 */ }
  },
  onShareAppMessage() { return { title: '十二生肖今日提点', path: '/pages/zodiac/zodiac' }; },
});
