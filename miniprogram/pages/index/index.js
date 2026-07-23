const almanac = require('../../utils/today-almanac.js');

Page({
  data: {
    today: null, zodiacs: null,
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
  onShareAppMessage() { return { title: '今天穿什么颜色 · 乾坤穿搭', path: '/pages/index/index' }; },
  onShareTimeline() { return { title: '今天穿什么颜色 · 乾坤穿搭' }; },
});
